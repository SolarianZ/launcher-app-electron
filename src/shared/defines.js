const PathType = {
  FILE: "file",
  FOLDER: "folder",
  URL: "url",
  COMMAND: "command",
};

class ListItem {
  constructor(path, type) {
    this.path = path;
    this.type = type;
  }
}

module.exports = {
  PathType,
  ListItem,
};
