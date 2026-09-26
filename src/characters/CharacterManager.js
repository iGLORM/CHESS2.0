class CharacterManager {
  static STAGE_COUNT = 15;

  static getCharacter(id) {
    return STORY_STAGES.find(c => c.id === id) ||
      (typeof StoryMissions !== 'undefined' && StoryMissions.character(id)) || STORY_STAGES[0];
  }

  // Story progress counts stages: Pawnie, five trainers, nine guardians.
  static getCharacterByStage(stage) {
    return STORY_STAGES[stage - 1] || STORY_STAGES[0];
  }

  static getAllCharacters() {
    return STORY_STAGES;
  }

  static getUnlockedCharacters(maxStage) {
    return STORY_STAGES.filter(c => c.stage <= maxStage);
  }

  static getCharacterSprite(character, size) {
    const texture = TextureManager.getCharacterTexture(character.id);
    if (texture) return texture;
    return SpriteGen.generateCharacterSprite(character.colors, size);
  }
}
