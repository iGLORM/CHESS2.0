class CharacterManager {
  static getCharacter(id) {
    return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
  }

  static getCharacterByLevel(level) {
    return CHARACTERS.find(c => c.level === level) || CHARACTERS[level - 1] || CHARACTERS[0];
  }

  static getAllCharacters() {
    return CHARACTERS;
  }

  static getUnlockedCharacters(maxLevel) {
    return CHARACTERS.filter(c => c.level <= maxLevel);
  }

  static getCharacterSprite(character, size) {
    return SpriteGen.generateCharacterSprite(character.colors, size);
  }
}
