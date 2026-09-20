// Per-map session copy: mission card brief (title / brief / eyebrow / topstat) and the art stamp in the corner.
// Pure data + lookups; app.js applies it to the DOM through session-chrome.js. Wording is unchanged from the former
// inline if(IS_x){...} chains in app.js; the reactor map keeps the defaults baked into the overlay markup.
export const DEFAULT_BRIEF=Object.freeze({title:'突破<span>暗影封锁</span>',brief:'启动西侧冷却装置，取得东侧权限，解除反应堆封锁。击败 Warden 后返回南部撤离。橙色突击、紫色远程、金色重装：识别敌人，选择打法。',eyebrow:'NEON ECLIPSE / SECTOR K-19',topstat:null});
export const DEFAULT_STAMP=Object.freeze({html:'<strong>SECTOR K–19</strong><span>ION REACTOR / 07<br>STATUS: HOSTILE OCCUPATION<br>清除守卫 · 夺回反应堆</span>',className:null});
export const SESSION_BRIEFS=Object.freeze({
 station:{title:'地下<span>运输站</span>',brief:'从维护通道恢复供电，清理站台，穿过停靠列车，完成调度防守后操作编号道岔，让维护列车撞开 SWITCHYARD 护盾，攻击青色核心，再登末班列车撤离。检查点仍按原五阶段保存。',eyebrow:'NEON ECLIPSE / U-02',topstat:'CHAPTER 02 / UNDERGROUND TRANSIT'},
 roof:{title:'天穹<span>通讯枢纽</span>',brief:'进入露天天线阵列，依次接通双中继、接管天线并上传信号。躲开放电区，最后返回南部升降平台撤离。',eyebrow:'NEON ECLIPSE / A-03',topstat:'CHAPTER 03 / SKYLINK ARRAY'},
 tower:{title:'多层<span>中枢塔</span>',brief:'解除大厅隔离，沿金色台阶逐层攀升至三米设备层和六米核心层。守住中枢隔离链路，再到东侧战斗升降井逐层击破 ELEVATOR 动力锁，最后返回大厅撤离。',eyebrow:'NEON ECLIPSE / C-04',topstat:'CHAPTER 04 / CONTROL SPIRE'},
 train:{title:'疾驰<span>货运列车</span>',brief:'穿越高速列车车厢，登上车顶关闭干扰器，守住控制链路，最后进入驾驶舱完成接应。跌落会返回当前阶段入口。',eyebrow:'NEON ECLIPSE / T-05',topstat:'CHAPTER 05 / RUNAWAY FREIGHT'},
 harbor:{title:'风暴<span>港口</span>',brief:'穿越集装箱堆场，登上吊机高架，守住码头信标，最后登船撤离。落水会返回当前阶段入口，星星探索不影响主线。',eyebrow:'NEON ECLIPSE / H-06',topstat:'CHAPTER 06 / STORM HARBOR'},
 orbital:{title:'轨道<span>电梯基座</span>',brief:'基座分三段重力：越高越轻，跳得更高、后坐更大。解除门禁，登上四米环与九米环，守住锚索校准，击破 TETHER 三段稳定器后攻击核心，返回升降平台撤离。',eyebrow:'NEON ECLIPSE / O-07',topstat:'CHAPTER 07 / ORBITAL TETHER BASE'},
 polar:{title:'极地<span>雷达阵列</span>',brief:'雪原每四十秒一场暴风雪：能见度十米、敌人靠热成像。体温持续流失，暖房与塔顶加热板回温。接通三座雷达塔，把重炮机甲 GLACIER 引上中央薄冰压碎冰面击沉，返回暖房撤离。',eyebrow:'NEON ECLIPSE / P-09',topstat:'CHAPTER 09 / POLAR RADAR ARRAY'},
 datacenter:{title:'沉没<span>数据中心</span>',brief:'机房定时涨水：水中移速减半、能量武器短路，基座顶始终干燥。解除进气闸，启动并守住两台排水泵，在排水窗口击破 ABYSS 核心，返回进气闸撤离。',eyebrow:'NEON ECLIPSE / D-08',topstat:'CHAPTER 08 / SUNKEN DATA CENTER'},
});
export const SESSION_STAMPS=Object.freeze({
 station:{html:'<strong>UNDERGROUND</strong><span>U-02 / LAST SERVICE<br>维护通道 · 站台 · 车厢 · 调度室</span>',className:'station-stamp'},
 roof:{html:'<strong>SKYLINK ARRAY</strong><span>A-03 / ABOVE THE CITY<br>双中继 · 天线控制 · 信号上传</span>',className:'roof-stamp'},
 tower:{html:'<strong>CONTROL SPIRE</strong><span>C-04 / VERTICAL LOCKDOWN<br>大厅 · 设备层 · 核心层 · 撤离</span>',className:'tower-stamp'},
 train:{html:'<strong>RUNAWAY FREIGHT</strong><span>T-05 / MOVING TRAIN<br>尾车 · 货舱 · 车顶 · 机车接管</span>',className:'train-stamp'},
 harbor:{html:'<strong>STORM HARBOR</strong><span>H-06 / NIGHT EXTRACTION<br>堆场 · 吊机 · 码头 · 登船撤离</span>',className:'harbor-stamp'},
 orbital:{html:'<strong>ORBITAL TETHER</strong><span>O-07 / GRAVITY BANDS<br>门禁 · 四米环 · 九米锚索 · TETHER</span>',className:'orbital-stamp'},
 polar:{html:'<strong>POLAR ARRAY</strong><span>P-09 / WHITEOUT CYCLE<br>三塔 · 暖房 · 薄冰 · GLACIER</span>',className:'polar-stamp'},
 datacenter:{html:'<strong>SUNKEN DATA</strong><span>D-08 / TIDAL FLOODING<br>进气闸 · 双泵 · ABYSS · 撤离</span>',className:'datacenter-stamp'},
});
export function briefFor(mapId){return SESSION_BRIEFS[mapId]||DEFAULT_BRIEF;}
export function stampFor(mapId){return SESSION_STAMPS[mapId]||DEFAULT_STAMP;}
