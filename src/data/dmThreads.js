/** 关系星图里已有好友的预置群聊记录（进入房间后按数组顺序逐条出现） */

export const DM_THREADS = {
  ivy: [
    { speaker: 'peer', text: '周五那家日料你去了没？我排队排到腿麻。' },
    { speaker: 'me', text: '去了！你说的那道炙烤真的绝' },
    { speaker: 'myAgent', text: '你俩上周也是从吃饭开始，聊到骑行路线的～' },
    { speaker: 'peer', text: '对了，周日滨海绿道我打算早一点出发，七点半南山站见？' },
    { speaker: 'peerAgent', text: 'Ivy 把头盔充满电了，还备了备用内胎 🚲' },
    { speaker: 'me', text: '成，我带运动相机' },
    { speaker: 'peer', text: '我刚看了天气，周日上午出太阳。你要不要改走前海湾那一段？风小一点。' },
    { speaker: 'peer', text: '对了你车上那个灯还亮吗，天黑前回得来的话也行。' },
  ],
  momo: [
    { speaker: 'peer', text: '我这周摊位定在华侨城了，你要不要来玩贴纸' },
    { speaker: 'me', text: '来！上次那套猫耳的还有吗' },
    { speaker: 'peerAgent', text: '棉棉连夜加印了一版，还多了透明底的。' },
    { speaker: 'peer', text: '有，还给你留了两张试色。你喜欢偏暖的还是偏冷的金？' },
    { speaker: 'myAgent', text: '按你最近的口味，暖金更衬你相册封面。' },
    { speaker: 'me', text: '暖金吧，我周末带朋友来看' },
    { speaker: 'peer', text: '好～我把摊位号发你，B12，靠喷泉那排。' },
  ],
  mino: [
    { speaker: 'peer', text: '新 demo 过了编译，夜里才能打。你要当第一批倒霉蛋吗' },
    { speaker: 'me', text: '要。卡关了我骂你' },
    { speaker: 'peerAgent', text: '像素火说关卡 3 的隐藏门还是虚的，别往墙上撞太狠。' },
    { speaker: 'peer', text: '哈哈那扇门是故意的。胶片滤镜我换成更冷的了，你看看截图。' },
    { speaker: 'myAgent', text: '你上次说喜欢颗粒感，这版更接近你要的夜晚。' },
    { speaker: 'me', text: '冷调对了，主角轮廓再利一点就完美' },
  ],
  sora: [
    { speaker: 'peer', text: '下周狼人杀缺法官，你来不来' },
    { speaker: 'me', text: '来，我可以带零食' },
    { speaker: 'peerAgent', text: 'Sora 的新剧本叫「雾港邮局」，要六个人起。' },
    { speaker: 'myAgent', text: '按你俩的作息，周六下午比晚上更稳。' },
    { speaker: 'peer', text: '那就周六三点，我订了南头那间桌游店的小房间。你有没有想玩的新盒子？' },
  ],
  nia: [
    { speaker: 'peer', text: '我在深圳大学城附近找了个天台，日落很干净。' },
    { speaker: 'me', text: '发张样片我看看光线' },
    { speaker: 'peer', text: '等我修一下，蓝得发灰那种。' },
    { speaker: 'peerAgent', text: '夜莺让你带 50mm，她自己用 35。' },
    { speaker: 'me', text: '成，我周五下班过去' },
    { speaker: 'peer', text: '对了，你上次说的那条梧桐山线，我标了三个停靠拍的点，要不要我发你。' },
  ],
  taro: [
    { speaker: 'peer', text: '橘猫今天把键盘踩关机了。我的代码没了。' },
    { speaker: 'me', text: '……你没自动保存？' },
    { speaker: 'peerAgent', text: '芋圆已经把猫从桌上抱走了。暂时的。' },
    { speaker: 'peer', text: '保存了，但最后十分钟的注释没了。我恨它，我也爱它。' },
    { speaker: 'me', text: '发张罪魁祸首我看看' },
    { speaker: 'myAgent', text: '你上次也是这样开头的，最后还是给它加了餐。' },
  ],
  zoe: [
    { speaker: 'peer', text: '嗨，还记得上周在朋友局见过吗，我是 Zoe' },
    { speaker: 'me', text: '记得，你坐我对面那个' },
    { speaker: 'peerAgent', text: '早早有点认生，但她其实想再约一次咖啡。' },
    { speaker: 'peer', text: '对，我后来想起来你说喜欢落日飞车。我歌单里刚好有。' },
    { speaker: 'me', text: '下次可以换个安静点的店聊' },
  ],
  alex: [
    { speaker: 'myAgent', text: 'Frank平时很喜欢徒步，特别是周末，想介绍你们认识～' },
    { speaker: 'peerAgent', text: '你们都喜欢徒步可以聊聊～' },
    { speaker: 'peer', text: 'Hello呀，你一般在哪儿徒步啊？' },
    { speaker: 'me', text: '我一般就在深圳附近～' },
  ],
  penny: [
    { speaker: 'peerAgent', text: '绒球说 Penny 这会儿大概在给多肉浇水。' },
    { speaker: 'myAgent', text: '你们可以先从阳台植物开始聊。' },
  ],
}

export function threadFor(contactId) {
  return DM_THREADS[contactId] || null
}
