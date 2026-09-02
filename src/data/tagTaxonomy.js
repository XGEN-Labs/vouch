// 三级标签体系(参考 MatrAIx-Persona-8B 的 taxonomy 设计):
//   1 级 = 领域分组 group(标签树的组织方式,按内容领域划分)
//   2 级 = 维度 dimension(一个可打标签的"槽位",如"MBTI"、"今日心情")
//   3 级 = 取值 value(该维度下的具体标签,如"INFP"、"emo")
//
// 中英双语:每个 group/dim 的 label 都是 [zh, en] 二元组;
// 每个 value 也是 [zh, en] 二元组,而不是单一字符串。
// 目的:(1) 对接国际通用体系(MBTI/星座等本就是英文起源,存英文才能和
//   MatrAIx 之类的标签库对齐);(2) 中/英两种表达都能作为语义匹配和
//   搜索的入口,不必局限于中文用户。
//
// 两个正交的分类方向不做成树,而是做成每个维度上的元数据,可按任一方向过滤:
//   facet(内容方向): personal=个人状态 | social=社交状态 | intent=社交意图 | privacy=隐私信息
//   layer(记忆方向): self=稳定自我 | social=社交面 | working=工作记忆(短期、经常变化)
// 其他元数据:
//   privacy: public=可公开 | friends=好友可见 | private=仅自己/仅灵伴
//   volatility: stable=基本不变 | slow=缓慢变化 | fast=高频变化(working 层默认 fast)
//   multi: 是否可多选(默认 true;单选维度如年龄段标 false)
// group 上的字段是该组维度的默认值,维度可单独覆盖。

export const FACETS = {
  personal: ['个人状态', 'Personal state'],
  social: ['社交状态', 'Social state'],
  intent: ['社交意图', 'Social intent'],
  privacy: ['隐私信息', 'Private info'],
}

export const LAYERS = {
  self: ['自我', 'Self'],
  social: ['社交面', 'Social'],
  working: ['短期状态', 'Working memory'],
}

export const TAG_TAXONOMY = [
  {
    id: 'identity',
    label: ['基本画像', 'Identity'],
    facet: 'privacy',
    layer: 'self',
    privacy: 'friends',
    volatility: 'stable',
    // 注意:年龄、性别、精确城市不在这里——它们不是"标签",是有唯一真值、
    // 已经由 Onboarding 结构化采集的字段(生日/gender/place,见 Onboarding.jsx、
    // persona.js),八字/星座计算也依赖这些精确值。年龄段/城市线级/大区这类
    // 派生视图改由 src/lib/demographics.js 从真实字段实时计算,不作为可
    // 手动编辑的标签存在——否则真实资料一变,标签就可能跟着漂移、脏掉。
    dims: [
      { id: 'languages', label: ['语言', 'Languages'], facet: 'social', privacy: 'public', values: [
        ['普通话', 'Mandarin'], ['粤语', 'Cantonese'], ['吴语', 'Wu Chinese'], ['闽南语', 'Southern Min'], ['客家话', 'Hakka'], ['英语', 'English'], ['日语', 'Japanese'], ['韩语', 'Korean'], ['法语', 'French'], ['西班牙语', 'Spanish'], ['德语', 'German'], ['手语', 'Sign language'],
      ] },
      { id: 'education', label: ['学历阶段', 'Education level'], multi: false, values: [
        ['高中及以下', 'High school or below'], ['大专', 'Associate degree'], ['本科在读', 'Undergrad (in progress)'], ['本科', "Bachelor's degree"], ['硕士在读', "Master's (in progress)"], ['硕士', "Master's degree"], ['博士在读', 'PhD (in progress)'], ['博士', 'PhD'], ['不愿透露', 'Prefer not to say'],
      ] },
      { id: 'life_stage', label: ['人生阶段', 'Life stage'], values: [
        ['在读', 'Studying'], ['gap中', 'Taking a gap'], ['初入职场', 'Early career'], ['职场中期', 'Mid-career'], ['自由职业', 'Freelancing'], ['创业中', 'Building a startup'], ['备孕育儿', 'Trying to conceive / raising kids'], ['照顾家人', 'Caregiving for family'], ['退休', 'Retired'], ['转型期', 'In transition'],
      ] },
      { id: 'living_situation', label: ['居住状态', 'Living situation'], multi: false, values: [
        ['独居', 'Living alone'], ['合租', 'Flatsharing'], ['与伴侣同住', 'Living with partner'], ['与家人同住', 'Living with family'], ['住宿舍', 'Living in dorm'], ['有宠物同住', 'Living with pets'], ['常出差', 'Frequent business travel'], ['数字游民', 'Digital nomad'],
      ] },
      { id: 'relationship_status', label: ['婚恋状况', 'Relationship status'], multi: false, privacy: 'private', values: [
        ['单身', 'Single'], ['暧昧中', 'Talking stage'], ['恋爱中', 'In a relationship'], ['已婚', 'Married'], ['离异', 'Divorced'], ['丧偶', 'Widowed'], ['开放关系', 'Open relationship'], ['不愿透露', 'Prefer not to say'],
      ] },
    ],
  },
  {
    id: 'personality',
    label: ['性格人格', 'Personality'],
    facet: 'personal',
    layer: 'self',
    privacy: 'public',
    volatility: 'stable',
    dims: [
      { id: 'mbti', label: ['MBTI', 'MBTI'], multi: false, values: [
        ['INTJ', 'INTJ'], ['INTP', 'INTP'], ['ENTJ', 'ENTJ'], ['ENTP', 'ENTP'], ['INFJ', 'INFJ'], ['INFP', 'INFP'], ['ENFJ', 'ENFJ'], ['ENFP', 'ENFP'], ['ISTJ', 'ISTJ'], ['ISFJ', 'ISFJ'], ['ESTJ', 'ESTJ'], ['ESFJ', 'ESFJ'], ['ISTP', 'ISTP'], ['ISFP', 'ISFP'], ['ESTP', 'ESTP'], ['ESFP', 'ESFP'],
      ] },
      { id: 'temperament', label: ['性格底色', 'Temperament'], values: [
        ['开朗', 'Cheerful'], ['温和', 'Gentle'], ['敏感', 'Sensitive'], ['理性', 'Rational'], ['热血', 'Passionate'], ['慢热', 'Slow to warm up'], ['佛系', 'Laid-back'], ['强势', 'Assertive'], ['幽默', 'Humorous'], ['忧郁', 'Melancholic'], ['好奇', 'Curious'], ['固执', 'Stubborn'],
      ] },
      { id: 'social_battery_type', label: ['社交能量', 'Social energy type'], multi: false, values: [
        ['深度i人', 'Deep introvert'], ['偏i', 'Leans introvert'], ['i/e平衡', 'Balanced'], ['偏e', 'Leans extrovert'], ['纯e', 'Pure extrovert'], ['看场合切换', 'Switches by context'],
      ] },
      { id: 'attachment_style', label: ['依恋类型', 'Attachment style'], multi: false, privacy: 'friends', values: [
        ['安全型', 'Secure'], ['焦虑型', 'Anxious'], ['回避型', 'Avoidant'], ['恐惧回避型', 'Fearful-avoidant'], ['还没测过', "Haven't been tested"],
      ] },
      { id: 'decision_style', label: ['决策风格', 'Decision style'], values: [
        ['直觉型', 'Intuitive'], ['数据型', 'Data-driven'], ['拖延型', 'Procrastinator'], ['果断型', 'Decisive'], ['求稳型', 'Plays it safe'], ['冒险型', 'Risk-taker'], ['纠结型', 'Overthinker'], ['随大流', 'Goes with the flow'],
      ] },
      { id: 'emotion_style', label: ['情绪风格', 'Emotional style'], values: [
        ['稳定', 'Stable'], ['易焦虑', 'Prone to anxiety'], ['易共情', 'Highly empathetic'], ['钝感', 'Thick-skinned'], ['情绪化', 'Emotional'], ['习惯压抑', 'Tends to suppress'], ['乐观', 'Optimistic'], ['悲观', 'Pessimistic'], ['外冷内热', 'Cold outside, warm inside'],
      ] },
      { id: 'perfectionism', label: ['完美主义', 'Perfectionism'], multi: false, values: [
        ['重度完美主义', 'Hardcore perfectionist'], ['偏完美主义', 'Leans perfectionist'], ['适度', 'Moderate'], ['差不多就行', 'Good enough is fine'], ['完成大于完美', 'Done over perfect'],
      ] },
      { id: 'humor_style', label: ['幽默类型', 'Humor style'], values: [
        ['冷幽默', 'Deadpan'], ['自嘲型', 'Self-deprecating'], ['玩梗型', 'Meme-loving'], ['吐槽型', 'Snarky'], ['无厘头', 'Absurdist'], ['谐音梗', 'Punny'], ['黑色幽默', 'Dark humor'], ['不太幽默', 'Not that funny'],
      ] },
      { id: 'risk_appetite', label: ['风险偏好', 'Risk appetite'], multi: false, values: [
        ['极度求稳', 'Extremely risk-averse'], ['偏保守', 'Conservative'], ['中性', 'Neutral'], ['偏冒险', 'Adventurous'], ['爱刺激', 'Thrill-seeking'],
      ] },
    ],
  },
  {
    id: 'mystic',
    label: ['命理灵性', 'Mysticism & Astrology'],
    facet: 'personal',
    layer: 'self',
    privacy: 'public',
    volatility: 'stable',
    dims: [
      { id: 'zodiac_cn', label: ['生肖', 'Chinese zodiac'], multi: false, values: [
        ['鼠', 'Rat'], ['牛', 'Ox'], ['虎', 'Tiger'], ['兔', 'Rabbit'], ['龙', 'Dragon'], ['蛇', 'Snake'], ['马', 'Horse'], ['羊', 'Goat'], ['猴', 'Monkey'], ['鸡', 'Rooster'], ['狗', 'Dog'], ['猪', 'Pig'],
      ] },
      { id: 'sun_sign', label: ['太阳星座', 'Sun sign'], multi: false, values: [
        ['白羊座', 'Aries'], ['金牛座', 'Taurus'], ['双子座', 'Gemini'], ['巨蟹座', 'Cancer'], ['狮子座', 'Leo'], ['处女座', 'Virgo'], ['天秤座', 'Libra'], ['天蝎座', 'Scorpio'], ['射手座', 'Sagittarius'], ['摩羯座', 'Capricorn'], ['水瓶座', 'Aquarius'], ['双鱼座', 'Pisces'],
      ] },
      { id: 'moon_sign', label: ['月亮星座', 'Moon sign'], multi: false, values: [
        ['白羊座', 'Aries'], ['金牛座', 'Taurus'], ['双子座', 'Gemini'], ['巨蟹座', 'Cancer'], ['狮子座', 'Leo'], ['处女座', 'Virgo'], ['天秤座', 'Libra'], ['天蝎座', 'Scorpio'], ['射手座', 'Sagittarius'], ['摩羯座', 'Capricorn'], ['水瓶座', 'Aquarius'], ['双鱼座', 'Pisces'],
      ] },
      { id: 'rising_sign', label: ['上升星座', 'Rising sign'], multi: false, values: [
        ['白羊座', 'Aries'], ['金牛座', 'Taurus'], ['双子座', 'Gemini'], ['巨蟹座', 'Cancer'], ['狮子座', 'Leo'], ['处女座', 'Virgo'], ['天秤座', 'Libra'], ['天蝎座', 'Scorpio'], ['射手座', 'Sagittarius'], ['摩羯座', 'Capricorn'], ['水瓶座', 'Aquarius'], ['双鱼座', 'Pisces'],
      ] },
      { id: 'day_master', label: ['八字日主', 'Day Master'], multi: false, values: [
        ['甲木', 'Jia Wood'], ['乙木', 'Yi Wood'], ['丙火', 'Bing Fire'], ['丁火', 'Ding Fire'], ['戊土', 'Wu Earth'], ['己土', 'Ji Earth'], ['庚金', 'Geng Metal'], ['辛金', 'Xin Metal'], ['壬水', 'Ren Water'], ['癸水', 'Gui Water'],
      ] },
      { id: 'element_dominant', label: ['五行偏旺', 'Dominant element'], values: [
        ['木旺', 'Wood-dominant'], ['火旺', 'Fire-dominant'], ['土旺', 'Earth-dominant'], ['金旺', 'Metal-dominant'], ['水旺', 'Water-dominant'],
      ] },
      { id: 'element_favorable', label: ['五行喜用', 'Favorable element'], values: [
        ['喜木', 'Favors Wood'], ['喜火', 'Favors Fire'], ['喜土', 'Favors Earth'], ['喜金', 'Favors Metal'], ['喜水', 'Favors Water'],
      ] },
      { id: 'mystic_stance', label: ['灵性倾向', 'Spiritual stance'], values: [
        ['信八字', 'Believes in BaZi'], ['信星座', 'Believes in astrology'], ['信塔罗', 'Believes in tarot'], ['信MBTI', 'Believes in MBTI'], ['玄学娱乐派', 'Mysticism for fun'], ['科学怀疑派', 'Science skeptic'], ['半信半疑', 'On the fence'], ['水逆敏感', 'Mercury retrograde aware'], ['风水爱好者', 'Feng shui enthusiast'], ['正念冥想', 'Mindfulness/meditation'], ['无感', 'Indifferent'],
      ] },
    ],
  },
  {
    id: 'body_mind',
    label: ['身心状态', 'Body & Mind'],
    facet: 'personal',
    layer: 'working',
    privacy: 'friends',
    volatility: 'fast',
    dims: [
      { id: 'mood_today', label: ['今日心情', 'Mood today'], values: [
        ['开心', 'Happy'], ['平静', 'Calm'], ['兴奋', 'Excited'], ['emo', 'Feeling low'], ['焦虑', 'Anxious'], ['疲惫', 'Exhausted'], ['烦躁', 'Irritable'], ['委屈', 'Wronged/hurt'], ['孤独', 'Lonely'], ['满足', 'Content'], ['麻木', 'Numb'], ['期待', 'Looking forward to something'], ['纠结', 'Torn'], ['治愈中', 'Healing'],
      ] },
      { id: 'energy_level', label: ['精力水平', 'Energy level'], multi: false, values: [
        ['满电', 'Fully charged'], ['电量充足', 'Well charged'], ['一半电量', 'Half battery'], ['低电量', 'Low battery'], ['彻底没电', 'Completely drained'],
      ] },
      { id: 'stress_level', label: ['压力水平', 'Stress level'], multi: false, values: [
        ['无压一身轻', 'Stress-free'], ['轻度压力', 'Mild stress'], ['中度压力', 'Moderate stress'], ['高压运转', 'High pressure'], ['快撑不住了', 'Barely holding on'],
      ] },
      { id: 'sleep_state', label: ['睡眠状态', 'Sleep state'], values: [
        ['作息规律', 'Regular schedule'], ['失眠中', 'Insomnia'], ['熬夜中', 'Staying up late'], ['补觉中', 'Catching up on sleep'], ['早睡早起', 'Early to bed, early to rise'], ['昼夜颠倒', 'Day-night reversed'], ['多梦', 'Restless dreams'], ['嗜睡期', 'Oversleeping phase'],
      ] },
      { id: 'body_state', label: ['身体状态', 'Physical state'], privacy: 'private', values: [
        ['状态很好', 'Feeling great'], ['小感冒', 'Minor cold'], ['生理期', 'On period'], ['头疼脑胀', 'Headache'], ['腰酸背痛', 'Aching back'], ['肠胃不适', 'Upset stomach'], ['过敏季', 'Allergy season'], ['减脂期', 'Cutting'], ['增肌期', 'Bulking'], ['恢复期', 'Recovering'], ['久坐僵硬', 'Stiff from sitting'], ['体检焦虑', 'Checkup anxiety'],
      ] },
      { id: 'mental_state', label: ['心理状态', 'Mental state'], privacy: 'private', values: [
        ['状态很好', 'Doing great'], ['平稳', 'Stable'], ['低落期', 'Low period'], ['焦虑期', 'Anxious period'], ['倦怠期', 'Burnout phase'], ['恢复中', 'Recovering'], ['咨询中', 'In therapy'], ['需要支持', 'Needs support'],
      ] },
      { id: 'busyness', label: ['忙碌程度', 'Busyness'], multi: false, values: [
        ['很闲', 'Very free'], ['比较闲', 'Fairly free'], ['正常节奏', 'Normal pace'], ['比较忙', 'Fairly busy'], ['连轴转', 'Nonstop grind'],
      ] },
      { id: 'emo_theme', label: ['近期情绪主题', 'Recent emotional theme'], values: [
        ['治愈', 'Healing'], ['成长', 'Growth'], ['迷茫', 'Lost'], ['告别', 'Letting go'], ['新开始', 'New beginning'], ['思念', 'Missing someone'], ['和解', 'Reconciliation'], ['庆祝', 'Celebration'], ['等待', 'Waiting'], ['放下', 'Moving on'],
      ] },
    ],
  },
  {
    id: 'interests',
    label: ['兴趣爱好', 'Interests'],
    facet: 'personal',
    layer: 'self',
    privacy: 'public',
    volatility: 'slow',
    dims: [
      { id: 'music', label: ['音乐', 'Music'], values: [
        ['流行', 'Pop'], ['民谣', 'Folk'], ['摇滚', 'Rock'], ['说唱', 'Hip-hop'], ['电子', 'Electronic'], ['古典', 'Classical'], ['爵士', 'Jazz'], ['R&B', 'R&B'], ['国风', 'Chinese style (Guofeng)'], ['K-pop', 'K-pop'], ['J-pop', 'J-pop'], ['金属', 'Metal'], ['氛围音乐', 'Ambient'], ['播客', 'Podcasts'], ['Live现场', 'Live shows'], ['合唱', 'Choir/singing together'],
      ] },
      { id: 'screen', label: ['影视', 'Film & TV'], values: [
        ['电影', 'Movies'], ['美剧', 'US shows'], ['日剧', 'Japanese dramas'], ['韩剧', 'Korean dramas'], ['国产剧', 'Chinese dramas'], ['纪录片', 'Documentaries'], ['动漫', 'Anime'], ['综艺', 'Variety shows'], ['短剧', 'Short dramas'], ['恐怖片', 'Horror'], ['科幻片', 'Sci-fi'], ['文艺片', 'Arthouse films'], ['悬疑剧', 'Mystery/thriller'], ['老片考古', 'Old movie digging'],
      ] },
      { id: 'reading', label: ['阅读', 'Reading'], values: [
        ['小说', 'Fiction'], ['科幻', 'Sci-fi'], ['推理', 'Mystery'], ['文学', 'Literature'], ['历史', 'History'], ['哲学', 'Philosophy'], ['心理', 'Psychology'], ['传记', 'Biography'], ['漫画', 'Comics'], ['网文', 'Web novels'], ['诗歌', 'Poetry'], ['非虚构', 'Non-fiction'], ['商业书', 'Business books'], ['听书党', 'Audiobook listener'],
      ] },
      { id: 'gaming', label: ['游戏', 'Gaming'], values: [
        ['主机游戏', 'Console games'], ['端游', 'PC games'], ['手游', 'Mobile games'], ['MOBA', 'MOBA'], ['FPS', 'FPS'], ['开放世界', 'Open world'], ['剧情向', 'Story-driven'], ['模拟经营', 'Sim/management'], ['独立游戏', 'Indie games'], ['卡牌对战', 'Card battlers'], ['音游', 'Rhythm games'], ['桌游', 'Board games'], ['剧本杀', 'Murder mystery games'], ['棋类', 'Chess/board strategy'], ['Steam收藏家', 'Steam collector'], ['怀旧游戏', 'Retro gaming'],
      ] },
      { id: 'sports', label: ['运动', 'Sports'], values: [
        ['跑步', 'Running'], ['健身撸铁', 'Weightlifting'], ['瑜伽', 'Yoga'], ['游泳', 'Swimming'], ['骑行', 'Cycling'], ['爬山', 'Hiking'], ['羽毛球', 'Badminton'], ['篮球', 'Basketball'], ['足球', 'Soccer'], ['网球', 'Tennis'], ['乒乓球', 'Table tennis'], ['滑雪', 'Skiing'], ['攀岩', 'Climbing'], ['飞盘', 'Frisbee'], ['舞蹈', 'Dance'], ['普拉提', 'Pilates'], ['散步党', 'Walker'], ['拳击', 'Boxing'],
      ] },
      { id: 'outdoor', label: ['户外', 'Outdoors'], values: [
        ['露营', 'Camping'], ['徒步', 'Trekking'], ['钓鱼', 'Fishing'], ['citywalk', 'City walking'], ['自驾', 'Road trips'], ['风光摄影', 'Landscape photography'], ['观鸟', 'Birdwatching'], ['冲浪', 'Surfing'], ['潜水', 'Diving'], ['看星空', 'Stargazing'], ['骑摩托', 'Motorcycling'], ['赶海', 'Beachcombing'],
      ] },
      { id: 'making', label: ['手作创作', 'Making & Crafting'], values: [
        ['绘画', 'Drawing/painting'], ['书法', 'Calligraphy'], ['写作', 'Writing'], ['摄影', 'Photography'], ['手账', 'Journaling'], ['陶艺', 'Pottery'], ['编织', 'Knitting'], ['木工', 'Woodworking'], ['烘焙', 'Baking'], ['做饭', 'Cooking'], ['调酒', 'Mixology'], ['咖啡冲煮', 'Coffee brewing'], ['修图', 'Photo editing'], ['视频剪辑', 'Video editing'],
      ] },
      { id: 'acg', label: ['二次元', 'ACG / Otaku'], values: [
        ['追番', 'Anime watching'], ['游戏宅', 'Gamer otaku'], ['cos', 'Cosplay'], ['吃谷', 'Anime merch collecting'], ['同人创作', 'Fan creation'], ['声优粉', 'Seiyuu fan'], ['漫展常客', 'Con regular'], ['手办', 'Figures'], ['乙女游戏', 'Otome games'], ['宅舞', 'Idol dance covers'], ['轻小说', 'Light novels'],
      ] },
      { id: 'collecting', label: ['收藏', 'Collecting'], values: [
        ['手办', 'Figures'], ['球鞋', 'Sneakers'], ['黑胶', 'Vinyl records'], ['香水', 'Perfume'], ['文具', 'Stationery'], ['卡牌', 'Trading cards'], ['古着', 'Vintage clothing'], ['盲盒', 'Blind boxes'], ['相机', 'Cameras'], ['键盘', 'Keyboards'], ['模型', 'Model kits'],
      ] },
      { id: 'pets', label: ['宠物', 'Pets'], values: [
        ['猫派', 'Cat person'], ['狗派', 'Dog person'], ['养兔', 'Rabbit owner'], ['养鸟', 'Bird owner'], ['爬宠', 'Reptile owner'], ['观赏鱼', 'Fish keeper'], ['仓鼠', 'Hamster owner'], ['云养宠', 'Pet vicariously'], ['想养观望中', 'Considering getting one'],
      ] },
      { id: 'food_scene', label: ['美食', 'Food scene'], values: [
        ['火锅', 'Hot pot'], ['烧烤', 'BBQ'], ['日料', 'Japanese food'], ['韩餐', 'Korean food'], ['西餐', 'Western food'], ['东南亚菜', 'Southeast Asian food'], ['川菜', 'Sichuan food'], ['粤菜', 'Cantonese food'], ['面食', 'Noodles'], ['甜品', 'Desserts'], ['咖啡馆巡礼', 'Cafe hopping'], ['深夜食堂', 'Late-night eats'], ['街边小吃', 'Street food'], ['自助战神', 'All-you-can-eat champion'],
      ] },
      { id: 'travel_style', label: ['旅行偏好', 'Travel style'], values: [
        ['自然风光', 'Nature scenery'], ['人文古迹', 'Cultural heritage'], ['海岛', 'Islands'], ['雪山', 'Mountains/snow'], ['小众目的地', 'Off-the-beaten-path'], ['穷游', 'Backpacking on a budget'], ['舒适游', 'Comfort travel'], ['出境游', 'International travel'], ['周边游', 'Nearby trips'], ['说走就走', 'Spontaneous trips'], ['深度慢游', 'Slow travel'], ['美食之旅', 'Food-focused trips'],
      ] },
    ],
  },
  {
    id: 'lifestyle',
    label: ['生活方式', 'Lifestyle'],
    facet: 'personal',
    layer: 'self',
    privacy: 'public',
    volatility: 'slow',
    dims: [
      { id: 'chronotype', label: ['作息类型', 'Chronotype'], multi: false, values: [
        ['早鸟', 'Early bird'], ['夜猫子', 'Night owl'], ['作息混乱', 'Irregular schedule'], ['规律型', 'Regular schedule'], ['靠咖啡续命', 'Runs on coffee'], ['靠午睡回血', 'Recharges with naps'],
      ] },
      { id: 'diet', label: ['饮食偏好', 'Diet preference'], values: [
        ['无辣不欢', "Can't live without spice"], ['清淡党', 'Prefers light food'], ['甜党', 'Sweet tooth'], ['咸党', 'Prefers savory'], ['素食', 'Vegetarian'], ['轻食', 'Light meals'], ['夜宵党', 'Late-night snacker'], ['奶茶重度', 'Bubble tea addict'], ['咖啡续命', 'Runs on coffee'], ['家常菜', 'Home cooking'], ['探店党', 'Restaurant explorer'], ['外卖党', 'Delivery regular'],
      ] },
      { id: 'spending', label: ['消费风格', 'Spending style'], values: [
        ['精打细算', 'Budget-conscious'], ['该花就花', 'Spends when it counts'], ['冲动型', 'Impulse spender'], ['品质型', 'Quality-focused'], ['极简主义', 'Minimalist'], ['囤货型', 'Stockpiler'], ['为爱发电', 'Spends on passions'], ['攒钱中', 'Saving up'], ['薅羊毛达人', 'Deal hunter'], ['断舍离中', 'Decluttering'],
      ] },
      { id: 'commute', label: ['出行方式', 'Commute mode'], values: [
        ['地铁通勤', 'Subway commuter'], ['公交', 'Bus'], ['开车', 'Drives'], ['骑车', 'Bikes'], ['步行党', 'Walker'], ['打车', 'Rideshare'], ['电动车', 'E-scooter/e-bike'], ['高铁飞机常客', 'Frequent flyer/high-speed rail'],
      ] },
      { id: 'home_style', label: ['居家风格', 'Home style'], values: [
        ['极简', 'Minimalist'], ['温馨系', 'Cozy'], ['赛博电竞', 'Gaming setup'], ['绿植系', 'Plant-filled'], ['收纳控', 'Organizing enthusiast'], ['杂乱舒适', 'Cluttered but comfy'], ['宜家风', 'IKEA style'], ['复古风', 'Vintage style'],
      ] },
      { id: 'fashion', label: ['穿搭风格', 'Fashion style'], values: [
        ['简约基础', 'Minimal basics'], ['街头', 'Streetwear'], ['复古', 'Vintage'], ['甜系', 'Sweet style'], ['盐系', 'Understated cool'], ['工装', 'Workwear'], ['运动风', 'Athleisure'], ['正装通勤', 'Business formal'], ['国风', 'Chinese style'], ['山系户外', 'Outdoor/gorpcore'], ['暗黑系', 'Dark/goth'], ['舒服就行', 'Just comfortable'],
      ] },
      { id: 'holiday_style', label: ['假期方式', 'Holiday style'], values: [
        ['宅家', 'Staying in'], ['短途游', 'Short trips'], ['长途旅行', 'Long trips'], ['特种兵式', 'Whirlwind sightseeing'], ['度假躺平', 'Resort relaxing'], ['回老家', 'Visiting hometown'], ['看展', 'Exhibitions'], ['音乐节', 'Music festivals'], ['学习充电', 'Learning/upskilling'], ['疯狂补觉', 'Catching up on sleep'], ['走亲访友', 'Visiting family/friends'], ['打卡拍照', 'Photo spots'],
      ] },
      { id: 'drinks', label: ['酒饮偏好', 'Drinks preference'], values: [
        ['滴酒不沾', "Doesn't drink"], ['微醺党', 'Light drinker'], ['精酿', 'Craft beer'], ['清酒', 'Sake'], ['威士忌', 'Whisky'], ['鸡尾酒', 'Cocktails'], ['红酒', 'Wine'], ['奶茶代酒', 'Bubble tea instead'],
      ] },
      { id: 'health_habit', label: ['健康习惯', 'Health habit'], values: [
        ['规律锻炼', 'Regular exercise'], ['偶尔运动', 'Occasional exercise'], ['基本不动', 'Mostly sedentary'], ['戒糖中', 'Cutting sugar'], ['戒酒中', 'Cutting alcohol'], ['戒烟中', 'Quitting smoking'], ['保温杯泡枸杞', 'Wolfberry tea in a thermos'], ['朋克养生', 'Punk wellness'], ['早睡计划', 'Early bedtime plan'], ['体检达人', 'Regular checkups'],
      ] },
    ],
  },
  {
    id: 'work_study',
    label: ['职业学业', 'Career & Study'],
    facet: 'personal',
    layer: 'self',
    privacy: 'friends',
    volatility: 'slow',
    dims: [
      { id: 'industry', label: ['行业', 'Industry'], values: [
        ['互联网', 'Internet/tech'], ['金融', 'Finance'], ['教育', 'Education'], ['医疗', 'Healthcare'], ['制造业', 'Manufacturing'], ['设计', 'Design'], ['媒体内容', 'Media/content'], ['法律', 'Law'], ['体制内', 'Public sector'], ['学生', 'Student'], ['自由职业', 'Freelance'], ['餐饮零售', 'F&B/retail'], ['艺术文化', 'Arts & culture'], ['科研', 'Research'], ['建筑地产', 'Architecture/real estate'], ['物流贸易', 'Logistics/trade'],
      ] },
      { id: 'role', label: ['职能', 'Function'], values: [
        ['产品', 'Product'], ['开发', 'Engineering'], ['设计师', 'Designer'], ['运营', 'Operations'], ['市场', 'Marketing'], ['销售', 'Sales'], ['HR', 'HR'], ['财务', 'Finance'], ['行政', 'Admin'], ['创始人', 'Founder'], ['研究员', 'Researcher'], ['教师', 'Teacher'], ['医护', 'Healthcare worker'], ['内容创作者', 'Content creator'], ['咨询顾问', 'Consultant'], ['工程师', 'Engineer'],
      ] },
      { id: 'work_mode', label: ['工作模式', 'Work mode'], multi: false, values: [
        ['坐班', 'In-office'], ['远程', 'Remote'], ['混合办公', 'Hybrid'], ['轮班倒班', 'Shift work'], ['出差多', 'Frequent travel'], ['自由安排', 'Flexible schedule'], ['在校', 'In school'], ['待业空窗', 'Career gap'],
      ] },
      { id: 'career_stage', label: ['职业阶段', 'Career stage'], multi: false, values: [
        ['实习中', 'Interning'], ['工作1-3年', '1-3 years experience'], ['3-5年', '3-5 years'], ['5-10年', '5-10 years'], ['10年以上', '10+ years'], ['管理层', 'Management'], ['自雇', 'Self-employed'], ['转行中', 'Career switching'],
      ] },
      { id: 'work_attitude', label: ['工作态度', 'Work attitude'], values: [
        ['卷王', 'Hustle culture'], ['躺平', 'Lying flat'], ['带薪摸鱼', 'Paid slacking'], ['真心热爱', 'Genuinely passionate'], ['搞钱为主', 'Money-focused'], ['寻找意义', 'Seeking meaning'], ['观望骑驴找马', 'Job hunting while employed'], ['准备跑路', 'Planning to quit'],
      ] },
      { id: 'studying', label: ['在学领域', 'Currently studying'], layer: 'working', volatility: 'fast', values: [
        ['外语', 'Foreign language'], ['编程', 'Programming'], ['AI工具', 'AI tools'], ['设计', 'Design'], ['写作', 'Writing'], ['考证', 'Certifications'], ['考研', 'Grad school exam'], ['考公', 'Civil service exam'], ['留学备考', 'Study abroad prep'], ['投资理财', 'Investing'], ['心理学', 'Psychology'], ['乐器', 'Musical instrument'], ['驾照', "Driver's license"], ['烹饪', 'Cooking'],
      ] },
      { id: 'commute_time', label: ['通勤时长', 'Commute time'], multi: false, values: [
        ['步行可达', 'Walkable'], ['半小时内', 'Under 30 min'], ['一小时内', 'Under 1 hour'], ['单程超一小时', 'Over 1 hour one-way'], ['远程无通勤', 'No commute (remote)'],
      ] },
    ],
  },
  {
    id: 'skills',
    label: ['技能专长', 'Skills'],
    facet: 'social',
    layer: 'self',
    privacy: 'public',
    volatility: 'slow',
    dims: [
      { id: 'hard_skills', label: ['硬技能', 'Hard skills'], values: [
        ['编程', 'Programming'], ['数据分析', 'Data analysis'], ['UI设计', 'UI design'], ['平面设计', 'Graphic design'], ['写作', 'Writing'], ['剪辑', 'Video editing'], ['摄影', 'Photography'], ['外语', 'Foreign languages'], ['翻译', 'Translation'], ['法律知识', 'Legal knowledge'], ['财务税务', 'Finance/tax'], ['医学常识', 'Medical knowledge'], ['机械维修', 'Mechanical repair'], ['驾驶', 'Driving'], ['AI提示词', 'AI prompting'], ['做PPT', 'Making slides'],
      ] },
      { id: 'soft_skills', label: ['软技能', 'Soft skills'], values: [
        ['倾听', 'Listening'], ['调解矛盾', 'Mediating conflict'], ['组织策划', 'Event planning'], ['演讲表达', 'Public speaking'], ['共情', 'Empathy'], ['做计划', 'Planning'], ['砍价', 'Bargaining'], ['找攻略', 'Finding guides/tips'], ['搞气氛', 'Hyping up a room'], ['讲故事', 'Storytelling'], ['带新人', 'Onboarding newcomers'], ['时间管理', 'Time management'],
      ] },
      { id: 'life_skills', label: ['生活技能', 'Life skills'], values: [
        ['做饭', 'Cooking'], ['烘焙', 'Baking'], ['修电脑', 'Fixing computers'], ['修水电', 'Home repairs'], ['化妆', 'Makeup'], ['穿搭指导', 'Styling advice'], ['理发', 'Haircutting'], ['收纳整理', 'Organizing'], ['养植物', 'Plant care'], ['带娃', 'Childcare'], ['照顾宠物', 'Pet care'], ['急救常识', 'First aid'], ['修图', 'Photo editing'], ['组装家具', 'Furniture assembly'],
      ] },
      { id: 'fun_skills', label: ['玩乐技能', 'Fun skills'], values: [
        ['唱歌', 'Singing'], ['乐器', 'Playing an instrument'], ['跳舞', 'Dancing'], ['桌游带教', 'Board game hosting'], ['游戏上分', 'Ranking up in games'], ['剧本杀DM', 'Mystery game host (DM)'], ['调酒', 'Mixology'], ['魔术', 'Magic tricks'], ['脱口秀', 'Stand-up comedy'], ['攒局达人', 'Event organizer'], ['狼人杀', 'Werewolf/Mafia game'], ['麻将', 'Mahjong'],
      ] },
      { id: 'can_help_with', label: ['可提供帮助', 'Can help with'], facet: 'intent', values: [
        ['内推', 'Referrals'], ['改简历', 'Resume review'], ['心理疏导', 'Emotional support'], ['技术支援', 'Tech support'], ['约拍摄影', 'Photo shoots'], ['顺路接送', 'Rides'], ['搬家搭手', 'Moving help'], ['宠物寄养', 'Pet sitting'], ['代排队', 'Queueing for others'], ['陪诊', 'Hospital accompaniment'], ['借书', 'Lending books'], ['装机咨询', 'PC building advice'],
      ] },
    ],
  },
  {
    id: 'social_style',
    label: ['社交风格', 'Social Style'],
    facet: 'social',
    layer: 'social',
    privacy: 'public',
    volatility: 'slow',
    dims: [
      { id: 'chat_style', label: ['聊天风格', 'Chat style'], values: [
        ['秒回型', 'Instant replier'], ['慢热型', 'Slow to warm up'], ['表情包大户', 'Meme spammer'], ['语音党', 'Voice message user'], ['文字党', 'Text-only'], ['长文输出', 'Long-message writer'], ['一句话选手', 'One-liner'], ['夜聊型', 'Night chatter'], ['表面高冷', 'Cold on the surface'], ['自来熟', 'Instantly friendly'], ['捧场王', 'Always hypes others up'], ['毒舌但真诚', 'Blunt but sincere'],
      ] },
      { id: 'social_battery', label: ['社交电量', 'Social battery'], multi: false, layer: 'working', volatility: 'fast', values: [
        ['满格想聊', 'Fully charged, wants to chat'], ['正常在线', 'Normally online'], ['省电模式', 'Power-saving mode'], ['仅熟人可见', 'Close friends only'], ['闭关勿扰', 'Do not disturb'], ['充电恢复中', 'Recharging'],
      ] },
      { id: 'offline_willingness', label: ['线下意愿', 'Meeting in person'], multi: false, values: [
        ['随时可约', 'Available anytime'], ['周末可约', 'Weekends only'], ['需要提前预约', 'Needs advance notice'], ['看心情', 'Depends on mood'], ['仅线上', 'Online only'], ['看对象是谁', "Depends who's asking"],
      ] },
      { id: 'group_role', label: ['群聊角色', 'Group chat role'], values: [
        ['潜水员', 'Lurker'], ['偶尔冒泡', 'Occasional poster'], ['话题发起者', 'Topic starter'], ['气氛组', 'Hype crew'], ['管理型', 'Group admin'], ['吃瓜群众', 'Spectator'], ['技术担当', 'Tech support'], ['资源分享侠', 'Resource sharer'], ['和事佬', 'Peacemaker'], ['戏精担当', 'Drama star'],
      ] },
      { id: 'conflict_style', label: ['冲突处理', 'Conflict style'], values: [
        ['有话直说', 'Speaks directly'], ['冷处理', 'Cold shoulder'], ['回避型', 'Avoidant'], ['找中间人', 'Finds a mediator'], ['幽默化解', 'Defuses with humor'], ['据理力争', 'Argues the point'], ['先道歉再说', 'Apologizes first'], ['事后复盘', 'Reflects afterward'],
      ] },
      { id: 'boundary', label: ['边界感', 'Boundaries'], multi: false, values: [
        ['很强', 'Very strong'], ['较强', 'Fairly strong'], ['适中', 'Moderate'], ['较弱', 'Fairly weak'], ['看关系深浅', 'Depends on closeness'], ['正在练习', 'Working on it'],
      ] },
      { id: 'friendship_view', label: ['友谊观', 'View on friendship'], values: [
        ['广交型', 'Wide social circle'], ['深交型', 'Few deep friendships'], ['阶段性友谊', 'Friendships come in seasons'], ['友谊终身制', 'Friends for life'], ['搭子制', 'Activity-buddy style'], ['独行侠', 'Lone wolf'], ['慢热但忠诚', 'Slow but loyal'], ['来者不拒', 'Open to anyone'],
      ] },
      { id: 'expression', label: ['表达方式', 'Expression style'], values: [
        ['直球', 'Direct'], ['含蓄', 'Reserved'], ['文艺腔', 'Poetic/artsy'], ['理性分析', 'Analytical'], ['情绪先行', 'Leads with emotion'], ['幽默包装', 'Wraps it in humor'], ['沉默寡言', 'Quiet'], ['看人下菜碟', 'Adapts to the person'],
      ] },
    ],
  },
  {
    id: 'social_intent',
    label: ['社交意图', 'Social Intent'],
    facet: 'intent',
    layer: 'working',
    privacy: 'public',
    volatility: 'fast',
    dims: [
      { id: 'buddy_seeking', label: ['找搭子', 'Looking for a buddy'], values: [
        ['饭搭子', 'Meal buddy'], ['健身搭子', 'Gym buddy'], ['爬山搭子', 'Hiking buddy'], ['旅游搭子', 'Travel buddy'], ['自习搭子', 'Study buddy'], ['游戏搭子', 'Gaming buddy'], ['看展搭子', 'Exhibition buddy'], ['追剧搭子', 'Show-watching buddy'], ['演唱会搭子', 'Concert buddy'], ['摸鱼搭子', 'Slacking-off buddy'], ['遛狗搭子', 'Dog-walking buddy'], ['咖啡搭子', 'Coffee buddy'], ['羽毛球搭子', 'Badminton buddy'], ['滑雪搭子', 'Skiing buddy'], ['桌游搭子', 'Board game buddy'], ['拍照搭子', 'Photo buddy'], ['早起搭子', 'Early-riser buddy'], ['减脂搭子', 'Weight-loss buddy'],
      ] },
      { id: 'romance_intent', label: ['情感意图', 'Romantic intent'], multi: false, privacy: 'friends', values: [
        ['想脱单', 'Looking to date'], ['想暧昧', 'Open to flirting'], ['只交朋友', 'Friends only'], ['开放心态', 'Open-minded'], ['刚分手勿扰', "Just broke up, don't approach"], ['佛系随缘', 'Whatever happens happens'], ['主动出击', 'Proactive'], ['慢热观察', 'Slow to warm up'], ['朋友介绍优先', 'Prefers intros via friends'],
      ] },
      { id: 'talk_needs', label: ['倾诉需求', 'Need to talk'], privacy: 'friends', values: [
        ['想找人聊聊', 'Wants to talk'], ['需要建议', 'Needs advice'], ['只想被倾听', 'Just wants to be heard'], ['求安慰', 'Needs comfort'], ['求骂醒', 'Needs a reality check'], ['找同类', 'Looking for someone similar'], ['愿意陪聊', 'Happy to listen'], ['树洞开放中', 'Open as a sounding board'], ['想听故事', 'Wants to hear a story'], ['想吐槽工作', 'Wants to vent about work'],
      ] },
      { id: 'collab_intent', label: ['合作意图', 'Collaboration intent'], values: [
        ['找合伙人', 'Looking for a co-founder'], ['找项目队友', 'Looking for project teammates'], ['接单中', 'Taking gigs'], ['求内推', 'Seeking referral'], ['找导师', 'Looking for a mentor'], ['愿当导师', 'Willing to mentor'], ['资源互换', 'Resource exchange'], ['组局招人', 'Recruiting for a project'], ['找练习对象', 'Looking for a practice partner'], ['共学小组', 'Study group'],
      ] },
      { id: 'help_needs', label: ['求助需求', 'Need help'], values: [
        ['求攻略', 'Wants tips/guides'], ['求推荐', 'Wants recommendations'], ['借工具', 'Borrowing tools'], ['技术求助', 'Tech help needed'], ['搬家求助', 'Moving help needed'], ['宠物代照顾', 'Pet-sitting needed'], ['拼单拼车', 'Group buy/carpool'], ['求本地向导', 'Local guide needed'], ['求陪同', 'Wants company'], ['找紧急联系人', 'Looking for emergency contact'],
      ] },
      { id: 'recruiting', label: ['当前组局', 'Currently organizing'], values: [
        ['组饭局', 'Dinner meetup'], ['组旅行', 'Trip planning'], ['组观影', 'Movie night'], ['组桌游', 'Board game night'], ['组球局', 'Sports game'], ['组自习', 'Study session'], ['组线上开黑', 'Online gaming squad'], ['组读书会', 'Book club'], ['组爬山', 'Hiking trip'], ['组livehouse', 'Livehouse show'],
      ] },
      { id: 'creating_together', label: ['内容共创', 'Creating together'], values: [
        ['一起做播客', 'Making a podcast together'], ['一起拍视频', 'Making videos together'], ['一起写东西', 'Writing together'], ['做开源项目', 'Open-source project'], ['做独立游戏', 'Indie game dev'], ['做社群', 'Building a community'], ['摆摊搭档', 'Market-stall partner'], ['一起做账号', 'Running an account together'],
      ] },
      { id: 'match_pref', label: ['匹配偏好', 'Match preference'], values: [
        ['同城优先', 'Same-city preferred'], ['同好优先', 'Same interests preferred'], ['同行优先', 'Same industry preferred'], ['同龄优先', 'Same age preferred'], ['只限女生', 'Women only'], ['只限男生', 'Men only'], ['不限', 'No preference'], ['熟人链优先', 'Mutual connections preferred'], ['八字合盘优先', 'BaZi compatibility preferred'],
      ] },
    ],
  },
  {
    id: 'relations',
    label: ['关系网络', 'Relationship Network'],
    facet: 'social',
    layer: 'social',
    privacy: 'friends',
    volatility: 'slow',
    dims: [
      { id: 'family_role', label: ['家庭角色', 'Family role'], values: [
        ['独生子女', 'Only child'], ['家里老大', 'Eldest child'], ['家里老二', 'Second child'], ['家里老幺', 'Youngest child'], ['新手爸妈', 'New parent'], ['资深爸妈', 'Experienced parent'], ['子女照护者', 'Caregiver to parents'], ['远离家乡', 'Far from hometown'], ['大家族', 'Big family'], ['丁克', 'DINK (childfree)'],
      ] },
      { id: 'circle_state', label: ['社交圈状态', 'Social circle status'], values: [
        ['圈子很广', 'Wide circle'], ['固定小圈子', 'Small fixed circle'], ['正在扩列', 'Expanding circle'], ['换城市重建中', 'Rebuilding after moving cities'], ['职场圈为主', 'Mostly work friends'], ['同学圈为主', 'Mostly school friends'], ['网友为主', 'Mostly online friends'], ['几乎没有圈子', 'Barely any circle'], ['兴趣社群活跃', 'Active in interest communities'], ['家人为主', 'Mostly family'],
      ] },
      { id: 'intimacy_state', label: ['亲密关系状态', 'Intimate relationship status'], multi: false, privacy: 'private', values: [
        ['稳定长跑', 'Stable long-term'], ['热恋期', 'Honeymoon phase'], ['磨合期', 'Adjusting phase'], ['异地中', 'Long-distance'], ['冷战中', 'In a cold war'], ['刚复合', 'Just got back together'], ['刚结束', 'Just ended'], ['母胎solo', 'Never been in a relationship'],
      ] },
      { id: 'network_assets', label: ['人脉资源', 'Network assets'], values: [
        ['HR朋友多', 'Knows lots of HR people'], ['医生朋友', 'Doctor friends'], ['律师朋友', 'Lawyer friends'], ['程序员扎堆', 'Surrounded by engineers'], ['媒体圈', 'Media circle'], ['学术圈', 'Academic circle'], ['创业圈', 'Startup circle'], ['文艺圈', 'Arts circle'], ['体制内朋友', 'Public-sector friends'], ['海外关系', 'Overseas connections'], ['本地地头蛇', 'Local insider'], ['摄影师朋友', 'Photographer friends'],
      ] },
      { id: 'platform_active', label: ['活跃平台', 'Active platforms'], values: [
        ['微信', 'WeChat'], ['小红书', 'Xiaohongshu'], ['微博', 'Weibo'], ['抖音', 'Douyin'], ['B站', 'Bilibili'], ['即刻', 'Jike'], ['豆瓣', 'Douban'], ['X', 'X (Twitter)'], ['Instagram', 'Instagram'], ['知乎', 'Zhihu'], ['几乎不刷', 'Barely active online'],
      ] },
      { id: 'want_to_meet', label: ['想认识的人', 'Wants to meet'], facet: 'intent', layer: 'working', values: [
        ['同行前辈', 'Industry seniors'], ['创业者', 'Founders'], ['设计师', 'Designers'], ['程序员', 'Engineers'], ['艺术家', 'Artists'], ['心理咨询师', 'Therapists'], ['健身达人', 'Fitness experts'], ['本地向导', 'Local guides'], ['有趣的灵魂', 'Interesting people'], ['同乡', 'People from hometown'],
      ] },
    ],
  },
  {
    id: 'current_context',
    label: ['近期动态', 'Recent Context'],
    facet: 'personal',
    layer: 'working',
    privacy: 'friends',
    volatility: 'fast',
    dims: [
      { id: 'busy_with', label: ['最近在忙', 'Currently busy with'], values: [
        ['赶项目', 'Rushing a project'], ['备考', 'Exam prep'], ['找工作', 'Job hunting'], ['搬家', 'Moving'], ['装修', 'Renovating'], ['婚礼筹备', 'Wedding planning'], ['带娃', 'Raising kids'], ['照顾家人', 'Caring for family'], ['创业冲刺', 'Startup sprint'], ['休假中', 'On leave'], ['康复中', 'Recovering'], ['旅行中', 'Traveling'], ['毕业季', 'Graduation season'], ['年底冲刺', 'Year-end crunch'],
      ] },
      { id: 'following', label: ['最近在追', 'Currently following'], values: [
        ['新剧', 'New show'], ['新番', 'New anime'], ['综艺', 'Variety show'], ['球赛', 'Sports match'], ['电竞比赛', 'Esports tournament'], ['网文', 'Web novel'], ['播客', 'Podcast'], ['UP主', 'Content creator'], ['演唱会', 'Concert'], ['展览', 'Exhibition'], ['新专辑', 'New album'],
      ] },
      { id: 'learning_now', label: ['最近在学', 'Currently learning'], values: [
        ['新语言', 'New language'], ['编程', 'Programming'], ['AI工具', 'AI tools'], ['设计软件', 'Design software'], ['写作', 'Writing'], ['驾照', 'Driving'], ['烹饪', 'Cooking'], ['乐器', 'Instrument'], ['投资理财', 'Investing'], ['心理学', 'Psychology'], ['健身知识', 'Fitness knowledge'], ['全新领域', 'A whole new field'],
      ] },
      { id: 'shopping_for', label: ['最近想买', 'Currently shopping for'], values: [
        ['手机', 'Phone'], ['电脑', 'Computer'], ['相机', 'Camera'], ['家具家电', 'Furniture/appliances'], ['车', 'Car'], ['健身装备', 'Fitness gear'], ['乐器', 'Instrument'], ['游戏机', 'Game console'], ['宠物', 'Pet'], ['旅行装备', 'Travel gear'], ['键盘', 'Keyboard'], ['香水', 'Perfume'],
      ] },
      { id: 'planning', label: ['最近计划', 'Currently planning'], values: [
        ['换工作', 'Job change'], ['换城市', 'City change'], ['一次旅行', 'A trip'], ['考证', 'Certification'], ['健身计划', 'Fitness plan'], ['存钱目标', 'Savings goal'], ['学新技能', 'New skill'], ['养宠物', 'Getting a pet'], ['搬家', 'Moving'], ['开始副业', 'Starting a side hustle'], ['断舍离', 'Decluttering'], ['重启社交', 'Restarting social life'],
      ] },
      { id: 'free_slots', label: ['本周可约', 'Available this week'], facet: 'intent', values: [
        ['工作日晚上', 'Weekday evenings'], ['周五晚', 'Friday night'], ['周六白天', 'Saturday day'], ['周六晚', 'Saturday night'], ['周日白天', 'Sunday day'], ['周日晚', 'Sunday night'], ['午休时间', 'Lunch break'], ['随时都行', 'Anytime'],
      ] },
      { id: 'whereabouts', label: ['近期位置', 'Current whereabouts'], multi: false, values: [
        ['在家', 'At home'], ['在公司', 'At work'], ['在学校', 'At school'], ['出差中', 'On a business trip'], ['旅行中', 'Traveling'], ['回老家', 'Visiting hometown'],
      ] },
      { id: 'recent_wish', label: ['最近心愿', 'Recent wish'], values: [
        ['想被夸', 'Wants to be praised'], ['想放假', 'Wants a break'], ['想暴富', 'Wants to get rich'], ['想恋爱', 'Wants to fall in love'], ['想静静', 'Wants some quiet'], ['想搬家', 'Wants to move'], ['想改变', 'Wants change'], ['想见老朋友', 'Wants to see old friends'], ['想被理解', 'Wants to be understood'], ['想睡个好觉', 'Wants a good night\'s sleep'],
      ] },
    ],
  },
  {
    id: 'sensitive',
    label: ['隐私敏感', 'Sensitive & Private'],
    facet: 'privacy',
    layer: 'self',
    privacy: 'private',
    volatility: 'slow',
    dims: [
      { id: 'health_private', label: ['健康隐私', 'Private health'], values: [
        ['慢性病管理中', 'Managing a chronic condition'], ['过敏史', 'Allergy history'], ['心理咨询经历', 'Therapy history'], ['服药中', 'On medication'], ['术后恢复', 'Post-surgery recovery'], ['体检有异常', 'Abnormal checkup result'], ['家族病史', 'Family medical history'], ['生育相关', 'Fertility-related'], ['视力听力障碍', 'Vision/hearing impairment'], ['不宜剧烈运动', "Shouldn't do intense exercise"],
      ] },
      { id: 'finance_state', label: ['财务状况', 'Financial state'], values: [
        ['有房贷', 'Has a mortgage'], ['有车贷', 'Has a car loan'], ['负债中', 'In debt'], ['储蓄充足', 'Well saved'], ['月光', 'Lives paycheck to paycheck'], ['投资中', 'Investing'], ['被裁缓冲期', 'Post-layoff cushion'], ['家里有支持', 'Family financial support'],
      ] },
      { id: 'emotional_history', label: ['情感经历', 'Emotional history'], values: [
        ['分手创伤', 'Breakup trauma'], ['离异经历', 'Divorce experience'], ['长期单身', 'Long-term single'], ['被背叛过', 'Been betrayed'], ['异地失败', 'Failed long-distance relationship'], ['家庭变故', 'Family upheaval'], ['丧亲之痛', 'Grief from loss'], ['信任议题', 'Trust issues'],
      ] },
      { id: 'family_background', label: ['家庭背景', 'Family background'], values: [
        ['单亲家庭', 'Single-parent family'], ['重组家庭', 'Blended family'], ['留守经历', 'Left-behind child experience'], ['家境普通', 'Average family background'], ['家境优渥', 'Well-off family'], ['家庭压力大', 'High family pressure'], ['被催婚中', 'Pressured to marry'], ['与家人疏离', 'Distant from family'],
      ] },
      { id: 'identity_private', label: ['身份认同', 'Private identity'], values: [
        ['LGBTQ+', 'LGBTQ+'], ['有宗教信仰', 'Has religious beliefs'], ['少数民族', 'Ethnic minority'], ['移民背景', 'Immigrant background'], ['跨文化家庭', 'Cross-cultural family'], ['不愿透露', 'Prefer not to say'],
      ] },
    ],
  },
  {
    id: 'companion_pref',
    label: ['灵伴偏好', 'Companion Preference'],
    facet: 'personal',
    layer: 'self',
    privacy: 'private',
    volatility: 'slow',
    dims: [
      { id: 'persona_pref', label: ['灵伴人设', 'Companion persona'], values: [
        ['温柔治愈', 'Gentle & healing'], ['毒舌闺蜜', 'Sassy bestie'], ['理性军师', 'Rational strategist'], ['元气搭子', 'Energetic buddy'], ['高冷学霸', 'Aloof top student'], ['幽默段子手', 'Comedic jokester'], ['神秘玄学家', 'Mysterious mystic'], ['沉稳长辈', 'Steady elder figure'],
      ] },
      { id: 'interact_freq', label: ['互动频率', 'Interaction frequency'], multi: false, values: [
        ['高频陪伴', 'High-frequency companionship'], ['每日一签', 'Daily check-in'], ['有事再聊', 'Only when needed'], ['深夜档', 'Late-night slot'], ['随缘', 'Whenever it happens'],
      ] },
      { id: 'content_pref', label: ['内容偏好', 'Content preference'], values: [
        ['运势日签', 'Daily fortune'], ['情感建议', 'Relationship advice'], ['职场建议', 'Career advice'], ['健康提醒', 'Health reminders'], ['玄学科普', 'Mysticism explainers'], ['闲聊陪伴', 'Casual chat'], ['正念冥想', 'Mindfulness/meditation'], ['学习监督', 'Study accountability'],
      ] },
      { id: 'reminder_pref', label: ['提醒接受度', 'Reminder preference'], multi: false, values: [
        ['欢迎主动提醒', 'Welcomes proactive reminders'], ['重要事才提醒', 'Only important reminders'], ['只在我发起时回应', 'Only respond when I initiate'], ['完全静默', 'Fully silent'],
      ] },
    ],
  },
]

// ---- helpers ----

const dimMeta = (group, dim) => ({
  facet: dim.facet || group.facet,
  layer: dim.layer || group.layer,
  privacy: dim.privacy || group.privacy,
  volatility: dim.volatility || group.volatility,
  multi: dim.multi !== false,
})

// 展平成三级标签列表:
// [{ id, label, labelEn, groupId, groupLabel, groupLabelEn, dimId, dimLabel, dimLabelEn, facet, layer, privacy, volatility, multi }]
export function flattenTags(taxonomy = TAG_TAXONOMY) {
  const out = []
  for (const group of taxonomy) {
    const [groupLabel, groupLabelEn] = group.label
    for (const dim of group.dims) {
      const meta = dimMeta(group, dim)
      const [dimLabel, dimLabelEn] = dim.label
      dim.values.forEach(([zh, en], i) => {
        out.push({
          id: `${group.id}.${dim.id}.${i}`,
          label: zh,
          labelEn: en,
          groupId: group.id,
          groupLabel,
          groupLabelEn,
          dimId: dim.id,
          dimLabel,
          dimLabelEn,
          ...meta,
        })
      })
    }
  }
  return out
}

// 按方向过滤:byFacet('intent') / byLayer('working')
export const byFacet = (facet) => flattenTags().filter((t) => t.facet === facet)
export const byLayer = (layer) => flattenTags().filter((t) => t.layer === layer)

// 双语查找:按中文或英文原文找到对应标签(用于自由输入归一化的第一步精确匹配)
export function findTagByText(text) {
  if (!text) return null
  const needle = text.trim().toLowerCase()
  return flattenTags().find(
    (t) => t.label.toLowerCase() === needle || t.labelEn.toLowerCase() === needle
  ) || null
}

export function taxonomyStats(taxonomy = TAG_TAXONOMY) {
  const dims = taxonomy.reduce((n, g) => n + g.dims.length, 0)
  const values = taxonomy.reduce((n, g) => n + g.dims.reduce((m, d) => m + d.values.length, 0), 0)
  return { groups: taxonomy.length, dims, values }
}
