CREATE TABLE blacklist (
    id INTEGER PRIMARY KEY,
    entityid TEXT,
    type INTEGER,
    source TEXT,
    start DATE DEFAULT CURRENT_TIMESTAMP,
    end DATE
);

CREATE TABLE guildSettings (
    id TEXT PRIMARY KEY,
    snipeMode INTEGER DEFAULT 0,
    flags INTEGER DEFAULT 0
);

CREATE TABLE guildChannelSettings (
    guildId TEXT,
    id TEXT PRIMARY KEY, /* iirc, and i still hope it's true, that a channel has a unique id */
    snipeMode INTEGER DEFAULT 0
);