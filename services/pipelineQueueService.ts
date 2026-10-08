/**
 * Visual Pipeline Recipe & Smart Batch Automation Queue
 * NKI Studio v4.3 Breakthrough Pillar 4
 * 
 * Chains visual synthesis, client-side local vision processing,
 * upscaling, and cloud vault sync into automated production recipes.
 */

export type PipelineStepType = 
  | 'STEP_PROMPT_ENRICH'
  | 'STEP_GENERATE'
  | 'STEP_LOCAL_DEPTH_NORMAL'
  | 'STEP_LOCAL_MICRO_SHARP'
  | 'STEP_UPSCALE_4K'
  | 'STEP_DRIVE_BACKUP';

export interface PipelineStep {
  id: string;
  type: PipelineStepType;
  title: string;
  description: string;
  isLocal0Api: boolean;
  enabled: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface PipelineRecipe {
  id: string;
  name: string;
  tagline: string;
  description: string;
  steps: PipelineStep[];
  estimatedTime: string;
  apiCost: string;
}

export const PREBUILT_RECIPES: PipelineRecipe[] = [
  {
    id: 'recipe_8k_cinema_master',
    name: '8K Masterwork Cinema Portrait',
    tagline: 'Quy trình tạo ảnh chân dung cao cấp chuẩn điện ảnh',
    description: 'Tự động mở rộng prompt -> Tạo ảnh -> Làm sắc nét vi mô lỗ chân lông cục bộ -> Phóng to 4K -> Đồng bộ Cloud Vault.',
    estimatedTime: '~15-25 giây',
    apiCost: '1 Lượt Gen + 1 Upscale (Tiết kiệm)',
    steps: [
      {
        id: 's1',
        type: 'STEP_PROMPT_ENRICH',
        title: 'Mở Rộng Prompt & Siêu Dữ Liệu',
        description: 'Tự động bổ sung chi tiết ánh sáng, cấu trúc da và thông số ống kính',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      },
      {
        id: 's2',
        type: 'STEP_GENERATE',
        title: 'Sinh Ảnh Gốc Độ Phân Giải Cao',
        description: 'Gọi mô hình Imagen 3 / Gemini Neural Engine tạo bố cục ban đầu',
        isLocal0Api: false,
        enabled: true,
        status: 'idle'
      },
      {
        id: 's3',
        type: 'STEP_LOCAL_MICRO_SHARP',
        title: 'Local Micro-Texture & Pore Sharpener (0 API)',
        description: 'Tăng cường độ nét vi mô lỗ chân lông và thớ vải 100% trên trình duyệt',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      },
      {
        id: 's4',
        type: 'STEP_UPSCALE_4K',
        title: 'Phóng To Siêu Phân Giải 4K Ultra Clarity',
        description: 'Khử nhiễu và mở rộng độ phân giải lên 4096px sắc nét từng chi tiết',
        isLocal0Api: false,
        enabled: true,
        status: 'idle'
      },
      {
        id: 's5',
        type: 'STEP_DRIVE_BACKUP',
        title: 'Sao Lưu Tự Động Lên Google Drive / Cloud Vault',
        description: 'Lưu trữ vĩnh viễn tệp 4K và metadata JSON vào thư mục NK Imagen Storage',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      }
    ]
  },
  {
    id: 'recipe_0api_local_vision',
    name: '0-API Local 3D Vision Processing',
    tagline: 'Xử lý thị giác máy tính 100% Offline trên Canvas',
    description: 'Trích xuất bản đồ độ sâu Depth Map 16-bit, Normal Map bề mặt và tách phông Alpha Matte ở tốc độ 60 FPS mà không tốn API.',
    estimatedTime: '< 1 giây',
    apiCost: '0 API (Hoàn toàn Miễn phí)',
    steps: [
      {
        id: 'lv1',
        type: 'STEP_LOCAL_DEPTH_NORMAL',
        title: 'Bản Đồ Độ Sâu 16-bit & Normal Map 3D',
        description: 'Tính toán ma trận độ sâu và vector pháp tuyến bề mặt Sobel',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      },
      {
        id: 'lv2',
        type: 'STEP_LOCAL_MICRO_SHARP',
        title: 'Bộ Lọc Sắc Nét Vi Mô 8K',
        description: 'Lọc thông cao Laplacian giữ nguyên màu sắc gốc và làm rõ chi tiết vi thể',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      }
    ]
  },
  {
    id: 'recipe_commercial_ecommerce',
    name: 'Commercial E-Commerce Catalog Pack',
    tagline: 'Dây chuyền sản phẩm thương mại 5 góc chụp',
    description: 'Sinh đồng bộ trọn gói Hero Shot, Góc 3/4, Mặt sau, Cận cảnh chất liệu và Ảnh đời sống thực tế.',
    estimatedTime: '~40 giây',
    apiCost: '5 Lượt Tạo Ảnh Chuẩn Hóa',
    steps: [
      {
        id: 'ec1',
        type: 'STEP_PROMPT_ENRICH',
        title: 'Chuẩn Hóa Ánh Sáng Studio Commercial',
        description: 'Thiết lập phông nền trắng chuẩn Amazon hoặc Lookbook cao cấp',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      },
      {
        id: 'ec2',
        type: 'STEP_GENERATE',
        title: 'Sinh Chuỗi 5 Góc Chụp Đồng Bộ',
        description: 'Tạo trọn bộ 5 góc chuẩn catalogue quốc tế',
        isLocal0Api: false,
        enabled: true,
        status: 'idle'
      },
      {
        id: 'ec3',
        type: 'STEP_LOCAL_MICRO_SHARP',
        title: 'Làm Nét Chất Liệu & Tem Nhãn (0 API)',
        description: 'Tăng cường chi tiết vải, da, logo và đường kim mũi chỉ',
        isLocal0Api: true,
        enabled: true,
        status: 'idle'
      }
    ]
  }
];

export interface ExecutionLog {
  timestamp: string;
  stepTitle: string;
  message: string;
  isError?: boolean;
}
