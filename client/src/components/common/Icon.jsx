/**
 * GraphTutor V3.0 - 统一图标组件
 * 
 * 功能：提供统一的图标接口，支持多种图标库
 */

// 导入图标库
// 注意：如果包未安装，需要先安装：npm install @tabler/icons-react lucide-react
import * as TablerIcons from '@tabler/icons-react';
import * as LucideIcons from 'lucide-react';

// 避免同一个缺失图标反复刷屏
const warnedMissingIcons = new Set();

function toCamelCaseKey(input) {
  if (!input || typeof input !== 'string') return input;
  return input
    .replace(/[_\s]+/g, '-')
    .split('-')
    .filter(Boolean)
    .map((part, idx) => (idx === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function toPascalCase(input) {
  const camel = toCamelCaseKey(input);
  if (!camel) return camel;
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function resolveFromLibraries(name) {
  if (!name) return null;
  const pascal = toPascalCase(name);
  const tablerKey = `Icon${pascal}`;
  return (
    TablerIcons?.[tablerKey] ||
    LucideIcons?.[pascal] ||
    null
  );
}

function resolveIconComponent(iconMap, name) {
  if (!iconMap || !name) return null;

  // 1) 直接命中
  if (iconMap[name]) return iconMap[name];

  // 2) kebab-case/underscore -> camelCase（例如 trending-up -> trendingUp）
  const camel = toCamelCaseKey(name);
  if (camel && iconMap[camel]) return iconMap[camel];

  // 3) 常见别名（项目里经常用到的短横线命名）
  const aliases = {
    'trending-up': 'trendingUp',
    'trending-down': 'trendingDown',
    'bar-chart': 'chartBar',
    'book-open': 'book',
    'message-circle': 'messageCircle',
    'arrow-left': 'arrowLeft',
    'arrow-right': 'arrowRight',
    'chevron-left': 'chevronLeft',
    'chevron-right': 'chevronRight',
    'chevron-up': 'chevronUp',
    'chevron-down': 'chevronDown',
    'external-link': 'externalLink',
    'eye-off': 'eyeOff',
    'thumb-up': 'thumbUp',
    'thumb-down': 'thumbDown',
  };
  const aliasKey = aliases[name];
  if (aliasKey && iconMap[aliasKey]) return iconMap[aliasKey];

  // 4) 直接从图标库导出里尝试解析（不依赖 iconMap 是否显式列出）
  return resolveFromLibraries(name);
}

// Emoji 备用映射（当图标库未安装时使用）
const emojiMap = {
  book: '📚',
  books: '📖',
  school: '🏫',
  notes: '📝',
  brain: '🧠',
  file: '📄',
  fileText: '📄',
  chart: '📊',
  chartBar: '📊',
  chartLine: '📈',
  target: '🎯',
  flag: '🚩',
  award: '🏆',
  trophy: '🥇',
  user: '👤',
  users: '👥',
  logout: '🚪',
  settings: '⚙️',
  cog: '⚙️',
  home: '🏠',
  menu: '☰',
  search: '🔍',
  plus: '➕',
  edit: '✏️',
  pencil: '✏️',
  trash: '🗑️',
  share: '🔗',
  heart: '❤️',
  star: '⭐',
  download: '⬇️',
  upload: '⬆️',
  check: '✅',
  close: '❌',
  x: '❌',
  refresh: '🔄',
  filter: '🔽',
  bell: '🔔',
  notification: '🔔',
  eye: '👁️',
  eyeOff: '👁️‍🗨️',
  lock: '🔒',
  lockOpen: '🔓',
  info: 'ℹ️',
  alert: '⚠️',
  success: '✅',
  error: '❌',
  question: '❓',
  help: '❓',
  calendar: '📅',
  clock: '🕐',
  tag: '🏷️',
  tags: '🏷️',
  folder: '📁',
  folderOpen: '📂',
  image: '🖼️',
  photo: '📷',
  video: '🎥',
  music: '🎵',
  code: '💻',
  message: '💬',
  mail: '📧',
  moon: '🌙',
  sun: '☀️',
  globe: '🌍',
  location: '📍',
};

// 图标映射表 - 优先使用 Tabler Icons，如果没有则使用 Lucide Icons
function getIconMap() {
  // 安全访问图标库
  const Tabler = TablerIcons || {};
  const Lucide = LucideIcons || {};
  
  return {
    // 学习相关
    book: Tabler.IconBook || Lucide.BookOpen,
    books: Tabler.IconBooks || Lucide.BookOpen,
    school: Tabler.IconSchool || Lucide.GraduationCap,
    notes: Tabler.IconNotes || Lucide.FileText,
    brain: Tabler.IconBrain || Lucide.Brain,
    file: Tabler.IconFileText || Lucide.FileText,
    fileText: Tabler.IconFileText || Lucide.FileText,
    fileQuestion: Tabler.IconFileQuestion || Lucide.FileQuestion,
    
    // 数据统计
    chart: Tabler.IconChartBar || Lucide.BarChart3,
    chartBar: Tabler.IconChartBar || Lucide.BarChart3,
    chartLine: Tabler.IconChartLine || Lucide.LineChart,
    graph: Tabler.IconGraph || Lucide.TrendingUp,
    database: Tabler.IconDatabase || Lucide.Database,
    trendingUp: Tabler.IconTrendingUp || Lucide.TrendingUp,
    trendingDown: Tabler.IconTrendingDown || Lucide.TrendingDown,
    
    // 目标与成就
    target: Tabler.IconTarget || Lucide.Target,
    flag: Tabler.IconFlag || Lucide.Flag,
    award: Tabler.IconAward || Lucide.Award,
    trophy: Tabler.IconTrophy || Lucide.Trophy,
    flame: Tabler.IconFlame || Lucide.Flame,
    
    // 用户相关
    user: Tabler.IconUser || Lucide.User,
    users: Tabler.IconUsers || Lucide.Users,
    logout: Tabler.IconLogout || Lucide.LogOut,
    
    // 系统设置
    settings: Tabler.IconSettings || Lucide.Settings,
    cog: Tabler.IconCog || Lucide.Cog,
    home: Tabler.IconHome || Lucide.Home,
    menu: Tabler.IconMenu || Lucide.Menu,
    
    // 操作按钮
    search: Tabler.IconSearch || Lucide.Search,
    plus: Tabler.IconPlus || Lucide.Plus,
    edit: Tabler.IconEdit || Lucide.Edit,
    pencil: Tabler.IconPencil || Lucide.Pencil,
    trash: Tabler.IconTrash || Lucide.Trash2,
    share: Tabler.IconShare || Lucide.Share2,
    heart: Tabler.IconHeart || Lucide.Heart,
    star: Tabler.IconStar || Lucide.Star,
    download: Tabler.IconDownload || Lucide.Download,
    upload: Tabler.IconUpload || Lucide.Upload,
    check: Tabler.IconCheck || Lucide.Check,
    close: Tabler.IconX || Lucide.X,
    x: Tabler.IconX || Lucide.X,
    refresh: Tabler.IconRefresh || Lucide.RefreshCw,
    filter: Tabler.IconFilter || Lucide.Filter,
    sortAsc: Tabler.IconSortAscending || Lucide.ArrowUp,
    sortDesc: Tabler.IconSortDescending || Lucide.ArrowDown,
    copy: Tabler.IconCopy || Lucide.Copy,
    link: Tabler.IconLink || Lucide.Link,
    externalLink: Tabler.IconExternalLink || Lucide.ExternalLink,
    save: Tabler.IconSave || Lucide.Save,
    floppy: Tabler.IconDeviceFloppy || Lucide.Save,
    printer: Tabler.IconPrinter || Lucide.Printer,
    send: Tabler.IconSend || Lucide.Send,
    
    // 通知
    bell: Tabler.IconBell || Lucide.Bell,
    bellRinging: Tabler.IconBellRinging || Lucide.BellRing,
    notification: Tabler.IconNotification || Lucide.Bell,
    
    // 可见性
    eye: Tabler.IconEye || Lucide.Eye,
    eyeOff: Tabler.IconEyeOff || Lucide.EyeOff,
    lock: Tabler.IconLock || Lucide.Lock,
    lockOpen: Tabler.IconLockOpen || Lucide.Unlock,
    
    // 导航
    chevronDown: Tabler.IconChevronDown || Lucide.ChevronDown,
    chevronUp: Tabler.IconChevronUp || Lucide.ChevronUp,
    chevronLeft: Tabler.IconChevronLeft || Lucide.ChevronLeft,
    chevronRight: Tabler.IconChevronRight || Lucide.ChevronRight,
    arrowLeft: Tabler.IconArrowLeft || Lucide.ArrowLeft,
    arrowRight: Tabler.IconArrowRight || Lucide.ArrowRight,
    
    // 状态提示
    info: Tabler.IconInfoCircle || Lucide.Info,
    alert: Tabler.IconAlertCircle || Lucide.AlertCircle,
    success: Tabler.IconCheckCircle || Lucide.CheckCircle,
    error: Tabler.IconXCircle || Lucide.XCircle,
    question: Tabler.IconQuestionMark || Lucide.HelpCircle,
    help: Tabler.IconHelp || Lucide.HelpCircle,
    
    // 时间日期
    calendar: Tabler.IconCalendar || Lucide.Calendar,
    clock: Tabler.IconClock || Lucide.Clock,
    
    // 标签分类
    tag: Tabler.IconTag || Lucide.Tag,
    tags: Tabler.IconTags || Lucide.Tags,
    folder: Tabler.IconFolder || Lucide.Folder,
    folderOpen: Tabler.IconFolderOpen || Lucide.FolderOpen,
    
    // 文件类型
    fileCheck: Tabler.IconFileCheck || Lucide.FileCheck,
    fileX: Tabler.IconFileX || Lucide.FileX,
    image: Tabler.IconImage || Lucide.Image,
    photo: Tabler.IconPhoto || Lucide.Camera,
    video: Tabler.IconVideo || Lucide.Video,
    music: Tabler.IconMusic || Lucide.Music,
    code: Tabler.IconCode || Lucide.Code,
    terminal: Tabler.IconTerminal || Lucide.Terminal,
    
    // 社交互动
    thumbUp: Tabler.IconThumbUp || Lucide.ThumbsUp,
    thumbDown: Tabler.IconThumbDown || Lucide.ThumbsDown,
    message: Tabler.IconMessage || Lucide.MessageSquare,
    messageCircle: Tabler.IconMessageCircle || Lucide.MessageCircle,
    mail: Tabler.IconMail || Lucide.Mail,
    
    // 品牌图标
    github: Tabler.IconBrandGithub || Lucide.Github,
    google: Tabler.IconBrandGoogle || Lucide.Chrome,
    facebook: Tabler.IconBrandFacebook || null,
    twitter: Tabler.IconBrandTwitter || Lucide.Twitter,
    linkedin: Tabler.IconBrandLinkedin || Lucide.Linkedin,
    youtube: Tabler.IconBrandYoutube || Lucide.Youtube,
    discord: Tabler.IconBrandDiscord || null,
    telegram: Tabler.IconBrandTelegram || null,
    wechat: Tabler.IconBrandWechat || null,
    weibo: Tabler.IconBrandWeibo || null,
    qq: Tabler.IconBrandQq || null,
    
    // 主题
    moon: Tabler.IconMoon || Lucide.Moon,
    sun: Tabler.IconSun || Lucide.Sun,
    palette: Tabler.IconPalette || Lucide.Palette,
    language: Tabler.IconLanguage || Lucide.Languages,
    world: Tabler.IconWorld || Lucide.Globe,
    globe: Tabler.IconGlobe || Lucide.Globe,
    
    // 位置
    mapPin: Tabler.IconMapPin || Lucide.MapPin,
    location: Tabler.IconLocation || Lucide.MapPin,
  };
}

/**
 * 统一图标组件
 * @param {string} name - 图标名称
 * @param {number} size - 图标大小（默认20）
 * @param {string} color - 图标颜色
 * @param {string} className - 额外的CSS类名
 * @param {object} props - 其他属性
 */
export default function Icon({ 
  name, 
  size = 20, 
  color, 
  className = '', 
  stroke = 1.5,
  useEmoji = false, // 强制使用 emoji
  ...props 
}) {
  const iconMap = getIconMap();
  
  // 如果图标库未安装或强制使用 emoji，使用 emoji
  if (useEmoji || !iconMap) {
    const emoji = emojiMap[name];
    if (emoji) {
      return (
        <span 
          className={className}
          style={{ 
            fontSize: size, 
            display: 'inline-block',
            lineHeight: 1,
            ...(color && { filter: `hue-rotate(${color})` })
          }}
          {...props}
        >
          {emoji}
        </span>
      );
    }
    console.warn(`Icon "${name}" not found in emoji map`);
    return null;
  }
  
  const IconComponent = resolveIconComponent(iconMap, name);
  
  if (!IconComponent) {
    if (!warnedMissingIcons.has(name)) {
      warnedMissingIcons.add(name);
      console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(iconMap));
    }
    // 尝试使用 emoji 作为后备
    const emoji = emojiMap[name];
    if (emoji) {
      return (
        <span 
          className={className}
          style={{ fontSize: size, display: 'inline-block', lineHeight: 1 }}
          {...props}
        >
          {emoji}
        </span>
      );
    }
    return null;
  }
  
  return (
    <IconComponent 
      size={size} 
      color={color} 
      className={className}
      stroke={stroke}
      {...props} 
    />
  );
}

/**
 * 获取所有可用的图标名称
 */
export function getAvailableIcons() {
  const iconMap = getIconMap();
  if (iconMap) {
    return Object.keys(iconMap);
  }
  return Object.keys(emojiMap);
}

/**
 * 检查图标是否存在
 */
export function hasIcon(name) {
  const iconMap = getIconMap();
  if (iconMap) {
    return iconMap.hasOwnProperty(name);
  }
  return emojiMap.hasOwnProperty(name);
}

