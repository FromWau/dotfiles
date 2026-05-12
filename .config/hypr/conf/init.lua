-- Load order matters: env first so vars are set before anything reads them;
-- colors before decoration/layouts that consume it; startup last.
require "conf.env"
require "conf.colors" -- returns a table; loaded for side-effect of caching
-- monitors.lua / workspaces.lua are committed as empty placeholders and
-- gitignored for local edits (per-device).
require "monitors"
require "workspaces"
require "conf.io"
require "conf.display_mode"
require "conf.layouts"
require "conf.rules"
require "conf.decoration"
require "conf.animations"
require "conf.bindings"
require "conf.per_device"
require "conf.misc"
require "conf.startup"
