// OpenMoji icons (CC BY-SA 4.0, https://openmoji.org) used as game art.
// Each key maps to public/emoji/<key>.svg.
export const EMOJI = [
  'angry', 'apple', 'ball', 'balloon', 'bed', 'blocks', 'books', 'boots', 'bread', 'broom', 'bucket', 'cap',
  'car', 'carrot', 'chair', 'cheese', 'cloud_rain', 'coat', 'couch', 'crayon', 'cry', 'cucumber', 'cup',
  'dino', 'door', 'drop', 'egg', 'fish', 'gift', 'gloves', 'ham', 'handshake', 'happy', 'heart', 'hourglass',
  'juice', 'kid_antek', 'kid_franek', 'kid_maja', 'kid_ola', 'kid_stas', 'kid_zosia', 'knife', 'lamp',
  'lettuce', 'lightbulb', 'milk', 'moon', 'musicbox', 'palette', 'pan', 'parent_antek', 'parent_franek',
  'parent_maja', 'parent_ola', 'parent_stas', 'parent_zosia', 'party', 'pepper', 'phone', 'piano', 'picture',
  'plant', 'plate', 'puzzle', 'rainbow', 'rocket', 'sandcastle', 'sandwich', 'scarf', 'shoe',
  'shop', 'shower', 'sick', 'sleepy', 'slide', 'slippers', 'snowflake', 'soap', 'sparkles', 'sponge', 'star',
  'sun', 'sunglasses', 'tea', 'teacher_1', 'teacher_2', 'teacher_3', 'teacher_4', 'teacher_5', 'teacher_6',
  'teapot', 'teddy', 'thermometer', 'toilet', 'toiletpaper', 'tomato', 'train', 'tree', 'umbrella',
  'unicorn', 'water', 'wave', 'zzz',
] as const;

export type EmojiKey = (typeof EMOJI)[number];
