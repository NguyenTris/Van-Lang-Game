export type ResourceKey = 'food' | 'wood' | 'stone' | 'bronze' | 'gold';
export type BuildingType = 'house' | 'chief' | 'rice-field' | 'barracks';
export type TrainedUnitType = 'lac-quan' | 'archer';

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
  | 'complete'
  | 'level1-build-field'
  | 'level1-drought'
  | 'level1-build-barracks'
  | 'level1-train-warrior'
  | 'level1-complete'
  | 'level2-train-archer'
  | 'level2-tribe-choice'
  | 'level2-conquest'
  | 'level2-complete';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  bronze: number;
  gold: number;
}

export interface SavedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  upgraded?: boolean;
}

export interface SavedUnit {
  id: string;
  type: TrainedUnitType;
  x: number;
  y: number;
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
  trainedUnits: SavedUnit[];
  originGiftClaimed: boolean;
  campaignStarted: boolean;
  droughtResolved: boolean;
  tribeOutcome: 'none' | 'diplomacy' | 'conquest';
}

export interface TutorialCopy {
  eyebrow: string;
  title: string;
  body: string;
  hint: string;
  step: number;
  total?: number;
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
    total: 8,
  },
  'select-au-co': {
    eyebrow: 'Làm quen điều khiển · 02/08',
    title: 'Chọn Âu Cơ',
    body: 'Nhấp chuột trái vào Âu Cơ. Vòng sáng dưới chân cho biết nhân vật đang được chọn.',
    hint: 'Tìm biểu tượng Âu Cơ trên bản đồ',
    step: 2,
    total: 8,
  },
  'gather-rice': {
    eyebrow: 'Nguồn sống Văn Lang · 03/08',
    title: 'Thu hoạch lúa dại',
    body: 'Khi Âu Cơ đang được chọn, nhấp chuột phải vào bụi lúa vàng bên cạnh bờ ruộng.',
    hint: 'Nội tại Âu Cơ: +50% sản lượng Lúa',
    step: 3,
    total: 8,
  },
  'gather-wood': {
    eyebrow: 'Khai mở xóm làng · 04/08',
    title: 'Lấy gỗ dựng nhà',
    body: 'Chọn Lạc Long Quân rồi nhấp chuột phải vào cây cổ thụ. Ngài thu thập nhanh hơn Lạc Dân.',
    hint: 'Cần đủ 50 Gỗ để dựng Nhà Sàn',
    step: 4,
    total: 8,
  },
  'build-house': {
    eyebrow: 'An cư lạc nghiệp · 05/08',
    title: 'Dựng Nhà Sàn đầu tiên',
    body: 'Chọn “Nhà Sàn” ở góc dưới phải, rồi đặt bản vẽ trên vùng đất trống.',
    hint: 'Nhà Sàn tăng giới hạn dân số và sinh 2 Lạc Dân',
    step: 5,
    total: 8,
  },
  'boss-warning': {
    eyebrow: 'Điềm dữ từ sông sâu',
    title: 'Mặt nước đang chuyển động…',
    body: 'Một thủy quái đã đánh hơi thấy xóm mới. Hãy chuẩn bị bảo vệ dân làng!',
    hint: 'Ngư Tinh đang bò lên bờ',
    step: 6,
    total: 8,
  },
  'fight-boss': {
    eyebrow: 'Bảo vệ con dân · 06/08',
    title: 'Đánh bại Ngư Tinh',
    body: 'Chọn Lạc Long Quân rồi nhấp chuột phải vào Ngư Tinh. Nội tại Long Quân khắc chế thủy quái.',
    hint: 'Ba đòn chiến phủ sẽ kết thúc trận đấu',
    step: 6,
    total: 8,
  },
  'build-chief': {
    eyebrow: 'Khởi lập bộ lạc · 07/08',
    title: 'Dựng Lều Trưởng Bản',
    body: 'Dùng số Đá thu được từ Ngư Tinh để dựng trung tâm đầu tiên của người Lạc Việt.',
    hint: 'Chọn Lều Trưởng Bản và đặt gần Nhà Sàn',
    step: 7,
    total: 8,
  },
  upgrade: {
    eyebrow: 'Thời đại mới · 08/08',
    title: 'Tiến vào Hùng Quốc Vương',
    body: 'Nhấn “Lên đời” để biến Lều Trưởng Bản thành Đền Hùng và mở khóa nền nông nghiệp lúa nước.',
    hint: 'Mở khóa: Thần Nông · Ruộng Lúa Nước',
    step: 8,
    total: 8,
  },
  complete: {
    eyebrow: 'Tutorial hoàn tất',
    title: 'Văn Lang đã khai mở',
    body: 'Nhận quà khởi nguyên để bắt đầu chương Hùng Quốc Vương.',
    hint: 'Tiến trình được tự động lưu trên trình duyệt',
    step: 8,
    total: 8,
  },
  'level1-build-field': {
    eyebrow: 'Đời I · Hùng Quốc Vương · 01/04',
    title: 'Khai mở ruộng lúa nước',
    body: 'Dùng vật tư khởi nghiệp để đặt một Ruộng Lúa Nước. Ruộng sẽ tự sản xuất 15 Lúa mỗi 10 giây.',
    hint: 'Chọn Ruộng Lúa ở bảng hành động rồi đặt trên đất trống',
    step: 1,
    total: 4,
  },
  'level1-drought': {
    eyebrow: 'Đời I · Biến cố · 02/04',
    title: 'Hạn hán đầu mùa',
    body: 'Mặt ruộng đã khô cạn và ngừng sản xuất. Hãy nhờ Thần Nông làm lễ cầu mưa.',
    hint: 'Nhấn kỹ năng Gọi Mưa trong bảng hành động',
    step: 2,
    total: 4,
  },
  'level1-build-barracks': {
    eyebrow: 'Đời I · Dựng binh · 03/04',
    title: 'Dựng Trại Lạc Quân',
    body: 'Văn Lang cần lực lượng bảo vệ mùa màng. Thu thêm Gỗ nếu cần rồi dựng Trại Lạc Quân.',
    hint: 'Cần 80 Gỗ và 40 Đá',
    step: 3,
    total: 4,
  },
  'level1-train-warrior': {
    eyebrow: 'Đời I · Dựng binh · 04/04',
    title: 'Huấn luyện Chiến binh Rìu Đồng',
    body: 'Dùng Lúa và Đồng thau để huấn luyện chiến binh chuyên bảo vệ công trình.',
    hint: 'Chi phí: 60 Lúa · 20 Đồng',
    step: 4,
    total: 4,
  },
  'level1-complete': {
    eyebrow: 'Đời I hoàn tất',
    title: 'Nông nghiệp đã vững',
    body: 'Ruộng đã xanh trở lại và đội Lạc Quân đầu tiên sẵn sàng mở rộng bờ cõi.',
    hint: 'Mở khóa đời II: Hùng Hy Vương',
    step: 4,
    total: 4,
  },
  'level2-train-archer': {
    eyebrow: 'Đời II · Hùng Hy Vương · 01/02',
    title: 'Huấn luyện Xạ thủ Nỏ Tre',
    body: 'Lạc Hầu đã tới trợ giúp. Hãy huấn luyện một Xạ thủ để chuẩn bị thám sát biên giới.',
    hint: 'Chi phí: 40 Lúa · 40 Gỗ',
    step: 1,
    total: 2,
  },
  'level2-tribe-choice': {
    eyebrow: 'Đời II · Mở rộng bộ lạc · 02/02',
    title: 'Bộ lạc Vũ Ninh',
    body: 'Một bộ lạc đã lộ diện sau màn sương. Chọn kết minh bằng cống vật hoặc chinh phạt thủ lĩnh.',
    hint: 'Mỗi con đường cho phần thưởng và danh hiệu khác nhau',
    step: 2,
    total: 2,
  },
  'level2-conquest': {
    eyebrow: 'Đời II · Con đường chinh phạt',
    title: 'Khuất phục thủ lĩnh Vũ Ninh',
    body: 'Chọn Chiến binh Rìu Đồng rồi nhấp chuột phải vào thủ lĩnh cạnh trại Vũ Ninh.',
    hint: 'Lạc Quân gây thêm sát thương lên công sự bộ lạc',
    step: 2,
    total: 2,
  },
  'level2-complete': {
    eyebrow: 'Đời II hoàn tất',
    title: 'Bờ cõi được mở rộng',
    body: 'Vũ Ninh đã trở thành chư hầu đầu tiên của Văn Lang. Hành trình đời III đang chờ phía trước.',
    hint: 'Nội dung Level 3 sẽ mở khóa trong bản cập nhật tiếp theo',
    step: 2,
    total: 2,
  },
};

export const BUILD_COSTS = {
  house: { wood: 50 },
  chief: { stone: 80 },
  'rice-field': { wood: 60 },
  barracks: { wood: 80, stone: 40 },
  upgrade: { food: 50, stone: 20, bronze: 80 },
  warrior: { food: 60, bronze: 20 },
  archer: { food: 40, wood: 40 },
  diplomacy: { food: 50, gold: 50 },
} as const;

export const EMPTY_SAVE: Omit<SaveState, 'savedAt'> = {
  version: 1,
  level: 0,
  resources: { ...INITIAL_RESOURCES },
  population: 2,
  populationCap: 6,
  tutorialStage: 'pan',
  buildings: [],
  trainedUnits: [],
  originGiftClaimed: false,
  campaignStarted: false,
  droughtResolved: false,
  tribeOutcome: 'none',
};
