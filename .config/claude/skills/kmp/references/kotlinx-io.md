# kotlinx-io file system across targets

Verified against the kotlinx-io **0.9.1** sources: the `kotlinx-io-core*-0.9.1-sources.jar` files in the Gradle
cache (`$XDG_DATA_HOME/gradle/caches/modules-2/files-2.1/org.jetbrains.kotlinx/`). Items marked *(tested)* were
also run on the JVM and Linux native; the rest is read from source. Before relying on a detail with a newer
version, unzip the jar for the target you care about and grep it again.

`SystemFileSystem` looks the same in `commonMain`, but each target implements it differently. These are the
differences that bit a real multiplatform module, each with what to do about it.

## Temp directory

| Target | `SystemTemporaryDirectory` |
|---|---|
| JVM, Android | `System.getProperty("java.io.tmpdir")` |
| Apple native | `NSTemporaryDirectory()`: per user on macOS, the sandbox's `tmp/` on iOS |
| Linux, mingw native | `Path(getenv("TMPDIR") ?: getenv("TMP") ?: "")` |

On Linux native with neither variable set, the usual desktop case, the result is an **empty, relative** path.
Anything built on it, such as test temp dirs, is then relative to the working directory, and symlinks created
there point nowhere. Fall back when it is not absolute: `SystemTemporaryDirectory.takeIf { it.isAbsolute } ?:
Path("/tmp")`.

## Absoluteness and separators

- `Path.isAbsolute` answers for the **host**. The JVM uses `File.isAbsolute`; mingw accepts a leading `/`, a
  drive (`C:\`, `C:/`), or whatever `PathIsRelativeA` calls absolute. So `Path("C:\\x").isAbsolute` is false on
  a Linux host, and tests of Windows path rules belong in `mingwTest`, not `commonTest`.
- `SystemPathSeparator` is `/` on **every** native target, mingw included (`nativeMain/files/PathsNative.kt`),
  although mingw also splits on `\`. To detect a Windows host from common code, use `Path("C:\\x").isAbsolute`,
  which is true only on Windows, JVM or mingw.
- `Path.parent` on the JVM is `File.parentFile`, which on Windows climbs a UNC path to `\\server` and then `\\`,
  neither of them a directory (per the JDK sources). Code that looks at every ancestor, such as a hand-written
  `mkdir -p`, then fails under a network share. Stop at the deepest ancestor that already is a directory.

## Probing and creating

- **JVM `exists` and `metadataOrNull`** answer `false` and `null` for a path they merely could not stat, and
  **JVM `list`** returns an empty listing for a directory it may not read (`file.list()?.forEach`). Neither can
  tell "absent" from "unreadable": check readability before listing, and use `java.nio.file` when the
  difference matters.
- **Native `exists`** is `access(F_OK)`. **Native `metadataOrNull`** differs by target. Linux and mingw use
  `stat` and throw for any failure other than ENOENT. Apple uses `fileAttributesAtPath` and returns null for
  every failure, so there, as on the JVM, an unreadable path reads as absent.
- **JVM `createDirectories`** calls `File.mkdirs()`, which returns `false` without throwing when a file blocks an
  ancestor or permission is denied; kotlinx-io only checks the leaf. Confirm the directory exists afterwards, or
  use `java.nio.file.Files.createDirectories` on the JVM, which throws `AccessDeniedException` and its siblings.
- **Native `createDirectories` fails when another process creates a level first** *(tested)*. It collects the
  missing ancestors with `exists`, then calls `mkdir` on each and throws on any error, EEXIST included
  (`mkdir failed: File exists`). Two processes writing their first file into the same missing folder hit this
  almost every time on Linux; the JVM's `mkdirs` tolerates it. Create one level at a time, starting below the
  deepest existing directory, and accept a level when `metadataOrNull(level)?.isDirectory == true` afterwards,
  whatever the call reported. That same check also catches the JVM's silent `mkdirs`.
- **`delete` skips a symlink whose target is gone** *(tested on the JVM)*. It checks `exists` first, which
  follows links on every target, so the link stays: silently with `mustExist = false`, and as a
  `FileNotFoundException` otherwise. Remove links with `java.nio.file.Files.deleteIfExists` on the JVM or
  `unlink` natively, and do it before any recursive delete that follows links.
- **A symlink loop ends at the kernel's link limit** *(tested on Linux)*, not at the path-length limit: after
  about 40 links in one path, `stat` fails with ELOOP. Linux native then throws, while the JVM's `exists` and
  `metadataOrNull` answer `false` and `null`, so a walk that follows links stops there without a word.
- **`FileMetadata`** has only `isRegularFile`, `isDirectory` and `size`: no modification time and no link
  information. Use the platform API (`Files.getLastModifiedTime`, `stat`) for those.

## Resolving and moving

| Call | JVM | POSIX native | mingw native |
|---|---|---|---|
| `resolve` | `File.canonicalFile`; a missing path throws `FileNotFoundException` | `realpath`; **any** failure throws a bare `IllegalStateException()` with no message | `GetFullPathNameA`: makes the path absolute but does **not** follow links or junctions |
| `atomicMove` | `Files.move(ATOMIC_MOVE, REPLACE_EXISTING)`; below Android API 26, where `java.nio.file` is missing, it throws `UnsupportedOperationException` | `rename` | `MoveFileExA` |

A cycle check or real-path lookup built on `resolve` does not work on Windows native: use `CreateFileW` with
`FILE_FLAG_BACKUP_SEMANTICS` plus `GetFinalPathNameByHandleW` there. On POSIX, call `realpath` yourself when you
need the errno.

## Writing a file without losing it

- **Opening a sink empties the file** *(tested)*. `sink(path)` truncates when it opens (`FileOutputStream` on
  the JVM, `fopen` natively), so a write that fails afterwards leaves the file empty or half-written. A
  read-only file fails at the open itself, before anything changes.
- **There is no permissions API**, so common code cannot copy a file's mode. Each strategy keeps something
  different:

  | Strategy | Old content after a failed write | Old content after a killed process | Readers never see half a file | Permissions, owner, hard links |
  |---|---|---|---|---|
  | `sink(path)` in place | lost | lost | no | kept |
  | temp file beside the target, then `atomicMove` | kept | kept | yes | lost: default mode, the writer as owner, hard links broken |
  | copy to a backup, write in place, then delete the backup, or move it back on failure | kept | the backup stays beside the half-written file | no | kept, except after a restore |

  Temp-and-rename suits a config file that another process may read at any moment. The backup variant is Vim's
  `writebackup` with `backupcopy=yes`, for files whose metadata must survive. Either way, resolve symlinks
  first, so the rename or the restore lands on the real file instead of replacing the link, and remember that
  the temp or backup file sits on disk with default permissions while the write runs.

  The backup variant also assumes a single writer: two in-place writes at once can leave a mix of both, and a
  restore renames the backup over whatever another process wrote meanwhile. A rename restore leaves other hard
  links holding the half-written content. Give backups a suffix of their own, so a cleanup of stale temp files
  never deletes what may be the only intact copy.
- **Bound a read by the stream, not only the size** *(tested)*. `metadataOrNull(path).size` is 0 for files with
  content such as those under `/proc`, and a file can grow after the check. After the size check, call
  `source.request(limit + 1)`: `true` means the file is over the limit. Skip that call at `Long.MAX_VALUE`, where
  `limit + 1` overflows and `request` throws for the negative count.

## Home directories

- **The JVM's `user.home` ignores `$HOME` on Linux** *(tested)*. It comes from the account database, so
  `HOME=/tmp/x java ...` still reports the real home. XDG's defaults are relative to `$HOME`, so read the
  variable first and fall back to `user.home`.
- **In a sandboxed macOS app**, `NSHomeDirectory()` and `NSSearchPathForDirectoriesInDomains` point into the
  app's container, per Apple's App Sandbox documentation, while a JVM process on the same machine still sees
  the account's home.

## Windows native uses the ANSI APIs

The mingw layer calls narrow functions throughout (`fopen`, `mkdir`, `opendir`/`readdir`, `access`,
`GetFullPathNameA`, `MoveFileExA`), and Kotlin/Native hands a `String` to a `const char*` as UTF-8. A path with
non-ASCII characters may therefore fail at any step, and listed names may come back mangled. The JVM on Windows
goes through NIO and is unaffected.

## Error messages

kotlinx-io exceptions carry its own wording, often with the path inside. To show the OS's words, parse per
platform:

| Where | Message shape |
|---|---|
| native open | `Failed to open <path> with <strerror>`; the path may itself contain " with ", so take the text after the last one |
| native mkdir | `mkdir failed: <strerror>` |
| native stat (Linux, mingw) | `stat failed to <path>: <strerror>` |
| native read, write, flush, close | `... failed with errno <n> (<strerror>)` |
| native listing | `Can't open directory <path>: <strerror>` |
| POSIX move | `Move failed: <strerror>` |
| mingw move | `Move failed with error code: <GetLastError()>` |
| JVM open | `FileInputStream`/`FileOutputStream` throw `FileNotFoundException("<absolute path> (<cause>)")` |
| JVM NIO | `FileSystemException` subclasses carry `reason`; `AccessDeniedException` and `NoSuchFileException` often have none, so map the type |

## Sinks

`buffered()`'s `RealSink.close()` writes out its buffer, closes the raw sink even when that write throws, then
rethrows. A failed write therefore never leaves the file open, which matters when you delete a temp file after
the failure on Windows.

## Testing file code on Kotlin/Native

All tested on Linux native.

- **POSIX helpers** create what common code cannot: `symlink`, `mkfifo`, `chmod`, `lstat`, `access` and `unlink`
  come from `platform.posix`. The resource-limit calls do not: `setrlimit`, `getrlimit`, `rlimit` and
  `RLIMIT_FSIZE` live in `platform.linux`.
- **`memScoped { }` has `MemScope` as its receiver**, so an unqualified `toString()` inside it answers for the
  scope instead of the enclosing extension receiver, and a path helper silently checks a path that does not
  exist. Read values into locals before the block.
- **Simulate a full disk** with `setrlimit(RLIMIT_FSIZE, ...)`: a write past the limit then fails with EFBIG.
  Install a `SIGXFSZ` handler first, such as `signal(SIGXFSZ, staticCFunction<Int, Unit> { })`, because the
  default action ends the process, and restore the old limit in `finally`.
- **Races** run on `kotlin.native.concurrent.Worker`, with `@OptIn(ObsoleteWorkersApi::class)`. Pass each input
  through `execute`'s producer lambda, keep the job lambda free of captured state, and repeat the race over
  enough rounds that the old code fails every run.
- **Skip permission tests by trying the operation itself.** After `chmod`, return early when the operation still
  works: `open(path, O_WRONLY)` without `O_TRUNC` for a read-only file, creating and removing a probe file for a
  read-only folder, `opendir` for an unreadable one. A uid check misses capabilities, and so does `access()`: it
  checks a non-root user with no capabilities at all, so a container runner with `CAP_DAC_OVERRIDE` gets EACCES
  from it and then succeeds at the real operation. `faccessat` sits in `platform.linux`, but the `AT_EACCESS` and
  `AT_FDCWD` constants that would fix this are not exported.
- **A FIFO opened for writing waits for a reader**, and a reader that closes early ends a Kotlin/Native process
  with SIGPIPE, since its default action is kept; the JVM reports `Broken pipe` instead.
