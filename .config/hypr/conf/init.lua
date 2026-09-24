-- Load order matters: env first so vars are set before anything reads them;
-- colors before decoration/layouts that consume it; startup last.
require "conf.env"
require "conf.colors" -- returns a table; loaded for side-effect of caching
-- conf.monitors requires monitors.lua itself; requiring it here too would
-- apply the nwg-displays rules unmerged.
-- workspaces.lua is a per-device placeholder, gitignored for local edits.
require "conf.monitors"
require "workspaces"
require "conf.io"
require "conf.layouts"
require "conf.rules"
require "conf.decoration"
require "conf.animations"
require "conf.bindings"
require "conf.per_device"
require "conf.misc"
require "conf.startup"
