export type ResourceKey = 'food' | 'wood' | 'stone' | 'bronze' | 'gold';

export type TutorialStage =
  | 'pan'
  | 'select-au-co'
  | 'gather-rice'
  | 'gather-wood'
  | 'build-house'
  | 'boss-warning'
  | 'fight-boss'
  | 'build-chief'
  | 'upgrade'
  | 'complete';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  bronze: number;
  gold: number;
}

export interface SavedBuilding {
  id: string;
  type: 'house' | 'chief';
  x: number;
  y: number;
  upgraded?: boolean;
}

export interface SaveState {
  version: 1;
  savedAt: number;
  level: number;
  resources: Resources;
  population: number;
  populationCap: number;
  tutorialStage: TutorialStage;
  buildings: SavedBuilding[];
  originGiftClaimed: boolean;
}

export interface TutorialCopy {
  eyebrow: string;
  title: string;
  body: string;
  hint: string;
  step: number;
}

export const INITIAL_RESOURCES: Resources = {
  food: 80,
  wood: 30,
  stone: 0,
  bronze: 0,
  gold: 0,
};

export const RESOURCE_META: Record<ResourceKey, { label: string; icon: string; color: string }> = {
  food: { label: 'Lúa', icon: '◒', color: '#e2b45a' },
  wood: { label: 'Gỗ', icon: '⌁', color: '#89a85b' },
  stone: { label: 'Đá', icon: '◆', color: '#b7b5a9' },
  bronze: { label: 'Đồng', icon: '⬡', color: '#d17c43' },
  gold: { label: 'Vàng', icon: '✦', color: '#f3ce66' },
};

export const TUTORIAL_COPY: Record<TutorialStage, TutorialCopy> = {
  pan: {
    eyebrow: 'Bước chân đầu tiên · 01/08',
    title: 'Quan sát miền đất mới',
    body: 'Dùng W A S D hoặc đưa chuột sát mép màn hình để dịch chuyển tầm nhìn.',
    hint: 'Di chuyển camera một đoạn để tiếp tục',
    step: 1,
  },
  'select-au-co': {
    eyebrow: 'Làm quen điều khiển · 02/08',
    title: 'Chọn Âu Cơ',
    body: 'Nhấp chuột trái vào Âu Cơ. Vòng sáng dưới chân cho biết nhân vật đang được chọn.',
    hint: 'Tìm biểu tượng Âu Cơ trên bản đồ',
    step: 2,
  },
  'gather-rice': {
    eyebrow: 'Nguồn sống Văn Lang · 03/08',
    title: 'Thu hoạch lúa dại',
    body: 'Khi Âu Cơ đang được chọn, nhấp chuột phải vào bụi lúa vàng bên cạnh bờ ruộng.',
    hint: 'Nội tại Âu Cơ: +50% sản lượng Lúa',
    step: 3,
  },
  'gather-wood': {
    eyebrow: 'Khai mở xóm làng · 04/08',
    title: 'Lấy gỗ dựng nhà',
    body: 'Chọn Lạc Long Quân rồi nhấp chuột phải vào cây cổ thụ. Ngài thu thập nhanh hơn Lạc Dân.',
    hint: 'Cần đủ 50 Gỗ để dựng Nhà Sàn',
    step: 4,
  },
  'build-house': {
    eyebrow: 'An cư lạc nghiệp · 05/08',
    title: 'Dựng Nhà Sàn đầu tiên',
    body: 'Chọn “Nhà Sàn” ở góc dưới phải, rồi đặt bản vẽ trên vùng đất trống.',
    hint: 'Nhà Sàn tăng giới hạn dân số và sinh 2 Lạc Dân',
    step: 5,
  },
  'boss-warning': {
    eyebrow: 'Điềm dữ từ sông sâu',
    title: 'Mặt nước đang chuyển động…',
    body: 'Một thủy quái đã đánh hơi thấy xóm mới. Hãy chuẩn bị bảo vệ dân làng!',
    hint: 'Ngư Tinh đang bò lên bờ',
    step: 6,
  },
  'fight-boss': {
    eyebrow: 'Bảo vệ con dân · 06/08',
    title: 'Đánh bại Ngư Tinh',
    body: 'Chọn Lạc Long Quân rồi nhấp chuột phải vào Ngư Tinh. Nội tại Long Quân khắc chế thủy quái.',
    hint: 'Ba đòn chiến phủ sẽ kết thúc trận đấu',
    step: 6,
  },
  'build-chief': {
    eyebrow: 'Khởi lập bộ lạc · 07/08',
    title: 'Dựng Lều Trưởng Bản',
    body: 'Dùng số Đá thu được từ Ngư Tinh để dựng trung tâm đầu tiên của người Lạc Việt.',
    hint: 'Chọn Lều Trưởng Bản và đặt gần Nhà Sàn',
    step: 7,
  },
  upgrade: {
    eyebrow: 'Thời đại mới · 08/08',
    title: 'Tiến vào Hùng Quốc Vương',
    body: 'Nhấn “Lên đời” để biến Lều Trưởng Bản thành Đền Hùng và mở khóa nền nông nghiệp lúa nước.',
    hint: 'Mở khóa: Thần Nông · Ruộng Lúa Nước',
    step: 8,
  },
  complete: {
    eyebrow: 'Tutorial hoàn tất',
    title: 'Văn Lang đã khai mở',
    body: 'Tiếp tục khai thác, khám phá bản đồ và chuẩn bị cho hành trình qua 18 đời Vua Hùng.',
    hint: 'Tiến trình được tự động lưu trên trình duyệt',
    step: 8,
  },
};

export const BUILD_COSTS = {
  house: { wood: 50 },
  chief: { stone: 80 },
  upgrade: { food: 50, stone: 20, bronze: 80 },
} as const;

export const EMPTY_SAVE: Omit<SaveState, 'savedAt'> = {
  version: 1,
  level: 0,
  resources: { ...INITIAL_RESOURCES },
  population: 2,
  populationCap: 6,
  tutorialStage: 'pan',
  buildings: [],
  originGiftClaimed: false,
};
