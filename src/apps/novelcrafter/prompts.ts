export interface WritingPrompt {
  id: string;
  title: string;
  category: string;
  text: string;
}

export const prompts: WritingPrompt[] = [
  {
    id: "opening-hook",
    title: "Opening hook",
    category: "Structure",
    text: "Write the first 300 words of a scene that begins in the middle of action, then reveals why the protagonist is there.",
  },
  {
    id: "character-voice",
    title: "Character voice",
    category: "Character",
    text: "Describe the same room from two characters' perspectives. One notices details of power and status; the other notices escape routes and danger.",
  },
  {
    id: "codex-deepen",
    title: "Deepen the Codex",
    category: "Worldbuilding",
    text: "Pick one Codex entry and write three sentences that only make sense after the reader has finished chapter three.",
  },
  {
    id: "scene-sequel",
    title: "Scene sequel",
    category: "Structure",
    text: "After a high-stakes scene, write a quiet sequel: reaction, dilemma, and a decision that creates the next scene's goal.",
  },
  {
    id: "dialogue-subtext",
    title: "Dialogue subtext",
    category: "Dialogue",
    text: "Write a conversation where both characters want the same thing but neither can say it directly. End on an unresolved gesture.",
  },
  {
    id: "setting-mood",
    title: "Setting as mood",
    category: "Worldbuilding",
    text: "Open a scene with weather, architecture, or sound that mirrors the protagonist's emotional state without naming the emotion.",
  },
];
