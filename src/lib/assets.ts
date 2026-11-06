// OpenMoji icons (CC BY-SA 4.0, https://openmoji.org) used as game art.
// Each key maps to public/emoji/<key>.svg.
export const EMOJI = [
  'album', 'angry', 'apple', 'apron', 'ball', 'balloon', 'balloon2', 'banana', 'bandage', 'bed', 'bell',
  'bird', 'blocks', 'blueberries', 'books', 'boots', 'bowl', 'box', 'bread', 'broom', 'bucket', 'butterfly',
  'cake', 'candle', 'candy', 'cap', 'car', 'carrot', 'cat', 'chair', 'cheese', 'chestnut', 'chocolate',
  'clay', 'cloud_rain', 'coat', 'couch', 'cowboy', 'crayon', 'crown', 'cry', 'cucumber', 'cup', 'cupcake',
  'dino', 'doctor', 'dog', 'door', 'drop', 'drum', 'duck', 'easteregg', 'egg', 'firefighter', 'firetruck',
  'fish', 'flower', 'fruitsalad', 'gift', 'gift2', 'glasses', 'gloves', 'gradcap', 'grapes', 'guitar', 'ham',
  'hamster', 'handshake', 'happy', 'heart', 'heart2', 'hedgehog', 'helmet', 'honey', 'hourglass', 'icecream',
  'juice', 'kid_antek', 'kid_franek', 'kid_lena', 'kid_maja', 'kid_ola', 'kid_stas', 'kid_tymek',
  'kid_zosia', 'kiwi', 'knife', 'lamp', 'leaf', 'lettuce', 'librarian', 'lightbulb', 'maple', 'mask', 'mic',
  'milk', 'moon', 'musicbox', 'necklace', 'onion', 'orange', 'ornament', 'palette', 'pan', 'parent_antek',
  'parent_franek', 'parent_lena', 'parent_maja', 'parent_ola', 'parent_stas', 'parent_tymek', 'parent_zosia',
  'party', 'pasta', 'pear', 'peas', 'pepper', 'phone', 'piano', 'picture', 'plant', 'plate', 'pool', 'pot',
  'potato', 'puzzle', 'rabbit', 'rainbow', 'ribbon', 'rocket', 'sandcastle', 'sandwich', 'santa', 'scarf',
  'seedling', 'seeds', 'shoe', 'shop', 'shower', 'sick', 'sled', 'sleepy', 'slide', 'slippers', 'snail',
  'snowflake', 'snowman', 'soap', 'sock', 'sparkles', 'sponge', 'spoon', 'squirrel', 'star', 'starxmas',
  'sticker', 'strawberry', 'sun', 'sunflower', 'sunglasses', 'sunhat', 'tea', 'teacher_1', 'teacher_2',
  'teacher_3', 'teacher_4', 'teacher_5', 'teacher_6', 'teapot', 'teddy', 'thermometer', 'toilet',
  'toiletpaper', 'tomato', 'tooth', 'toothbrush', 'tophat', 'trafficlight', 'train', 'tree', 'trumpet',
  'tulip', 'umbrella', 'unicorn', 'water', 'wave', 'xmastree', 'zzz',
] as const;

export type EmojiKey = (typeof EMOJI)[number] | 'swing';
