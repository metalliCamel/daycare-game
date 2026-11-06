// OpenMoji icons (CC BY-SA 4.0, https://openmoji.org) used as game art.
// Each key maps to public/emoji/<key>.svg.
export const EMOJI = [
  'apple', 'ball', 'bed', 'blocks', 'books', 'bread', 'broom', 'bucket', 'chair', 'cheese', 'coat', 'couch',
  'crayon', 'cry', 'cucumber', 'cup', 'door', 'drop', 'ham', 'happy', 'heart', 'kid_antek',
  'kid_franek', 'kid_ola', 'kid_zosia', 'lettuce', 'milk', 'palette', 'pan', 'picture', 'plant', 'plate',
  'puzzle', 'sandwich', 'shower', 'sick', 'sleepy', 'slide', 'soap', 'sparkles', 'sponge', 'star', 'teacher',
  'teapot', 'teddy', 'toilet', 'toiletpaper', 'tomato', 'tree',
] as const;

export type EmojiKey = (typeof EMOJI)[number];
