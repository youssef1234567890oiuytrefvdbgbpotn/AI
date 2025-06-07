const API_KEY = "AIzaSyB-z8p9hRR96shayxlrqKRqfEQMuLO7PTk"; //AIzaSyB-z8p9hRR96shayxlrqKRqfEQMuLO7PTk
const MODEL_NAME = "gemini-1.5-flash-latest";

if (API_KEY === "YOUR_API_KEY_HERE" || API_KEY.length < 30) {
  console.warn("API Key يبدو غير صحيح أو ما زال القيمة الافتراضية.");
}

const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const suggestionsContainer = document.getElementById("suggestions");

// Store conversation history
let conversationHistory = [];

// Predefined information about
const departmentInfo = `
        قسم تكنولوجيا التعليم بكلية التربية النوعية جامعة المنيا يقدم برنامجًا أكاديميًا شاملًا في مرحلة البكالوريوس مع تخصصين رئيسيين: أخصائي تكنولوجيا التعليم ومعلم الحاسب الآلي. يهدف القسم إلى إعداد كوادر متخصصة في دمج التقنيات الحديثة في العملية التعليمية، وتنمية مهارات الطلاب في استخدام وتصميم الوسائل التعليمية الرقمية. كما يضم القسم نخبة من أعضاء هيئة التدريس ذوي الخبرة في مجالات التعليم الإلكتروني والوسائل التعليمية الرقمية.
      `;

// Predefined answers for specific questions
const developerInfoAnswer = `
جورج عادل ويوسف شعبان هم شابان مصريان متميزان في تكريث جهودهما في جعل هذا المكان الي ما هو افضل.
<strong>المهارات:</strong>
- Front-End Development (HTML, CSS, JavaScript)
- Cybersecurity (Bug Bounty Hunting, OWASP Top 10)
- Python
- Linux Basics
- استخدام أدوات مثل PortSwigger

<strong>الاهتمامات:</strong>
- مهتم بدمج الذكاء الاصطناعي مع الأمن السيبراني.
`;

const sourceInfoAnswer =
  "أحصل على معلوماتي من قاعدة بيانات مخصصة تحتوي على معلومات دقيقة عن قسم تكنولوجيا التعليم بكلية التربية النوعية، جامعة المنيا، والتي قام بإعدادها جورج عادل.";

// Keywords for local handling
const developerKeywords = [
  "المطور",
  "مين يوسف",
  "من هو جورج",
  "who developed you",
  "who created you",
];
const sourceKeywords = [
  "مصدر معلوماتك",
  "كيف تحصل على المعلومات",
  "source of information",
  "where do you get info",
];

// Add message to chat
function addMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.innerHTML = text;

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'message-buttons';

  // Only for bot/assistant messages: add speak/copy buttons with language support
  if (sender === 'bot' || sender === 'assistant') {
    const lang = getLanguage ? getLanguage() : (document.documentElement.lang || 'ar');
    // Speak button
    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    speakBtn.onclick = () => {
      if (window.currentSpeech) {
        window.speechSynthesis.cancel();
        window.currentSpeech = null;
        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      } else {
        speakText(text);
        speakBtn.innerHTML = '<i class="fas fa-stop"></i>';
      }
    };
    buttonsDiv.appendChild(speakBtn);
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${lang === 'ar' ? 'نسخ' : 'Copy'}`;
    copyBtn.onclick = () => {
      const textToCopy = text.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `<i class="fas fa-check"></i> ${lang === 'ar' ? 'تم النسخ' : 'Copied'}`;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${lang === 'ar' ? 'نسخ' : 'Copy'}`;
        }, 2000);
      });
    };
    buttonsDiv.appendChild(copyBtn);
  }

  messageDiv.appendChild(messageContent);
  messageDiv.appendChild(buttonsDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add typing indicator
function addTypingMessage() {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", "bot-message");
  messageElement.id = "typing-indicator";

  const typingContainer = document.createElement("div");
  typingContainer.classList.add("typing-indicator-dots");
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.classList.add("dot");
    typingContainer.appendChild(dot);
  }
  messageElement.appendChild(typingContainer);

  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingMessage() {
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) {
    chatMessages.removeChild(typingIndicator);
  }
}

// دالة للبحث عن سؤال مشابه في سجل المحادثة
function findSimilarQuestion(userMessage) {
  // ابحث عن سؤال سابق مشابه (تطابق جزئي أو كامل)
  const lowerUserMessage = userMessage.trim().toLowerCase();
  for (let i = conversationHistory.length - 2; i >= 0; i -= 2) {
    const prevUserMsg = conversationHistory[i]?.text?.toLowerCase();
    if (prevUserMsg && (lowerUserMessage.includes(prevUserMsg) || prevUserMsg.includes(lowerUserMessage))) {
      // أرجع ملخص الإجابة السابقة (أول 100 حرف)
      const prevBotMsg = conversationHistory[i + 1]?.text;
      if (prevBotMsg) {
        return prevBotMsg.length > 100 ? prevBotMsg.slice(0, 100) + '... (إجابة مختصرة)' : prevBotMsg;
      }
    }
  }
  return null;
}

// نظام المعرفة التعليمية
const educationalMemory = {
  concepts: new Map(), // المفاهيم الأساسية
  relations: new Map(), // العلاقات بين المفاهيم
  examples: new Map(), // الأمثلة لكل مفهوم
  questions: new Map(), // الأسئلة الشائعة لكل مفهوم
  
  // إضافة مفهوم جديد
  addConcept(concept, details) {
    this.concepts.set(concept, {
      definition: details.definition,
      importance: details.importance || 'medium',
      category: details.category,
      prerequisites: details.prerequisites || [],
      relatedConcepts: details.relatedConcepts || []
    });
  },
  
  // إضافة علاقة بين مفهومين
  addRelation(concept1, concept2, relationType) {
    if (!this.relations.has(concept1)) {
      this.relations.set(concept1, new Map());
    }
    this.relations.get(concept1).set(concept2, relationType);
  },
  
  // إضافة مثال لمفهوم
  addExample(concept, example) {
    if (!this.examples.has(concept)) {
      this.examples.set(concept, []);
    }
    this.examples.get(concept).push(example);
  },
  
  // إضافة سؤال شائع لمفهوم
  addQuestion(concept, question, answer) {
    if (!this.questions.has(concept)) {
      this.questions.set(concept, []);
    }
    this.questions.get(concept).push({ question, answer });
  },
  
  // البحث عن مفهوم
  findConcept(query) {
    const results = [];
    for (const [concept, details] of this.concepts) {
      if (concept.includes(query) || 
          details.definition.includes(query) ||
          details.category.includes(query)) {
        results.push({ concept, ...details });
      }
    }
    return results;
  },
  
  // الحصول على المفاهيم المرتبطة
  getRelatedConcepts(concept) {
    const related = [];
    if (this.relations.has(concept)) {
      for (const [relatedConcept, relationType] of this.relations.get(concept)) {
        related.push({ concept: relatedConcept, relation: relationType });
      }
    }
    return related;
  }
};

// تحسين نظام الذاكرة الحالي
const conversationMemory = {
  shortTerm: [], // آخر 4 رسائل
  longTerm: [], // محادثات سابقة
  topics: new Map(), // تصنيف المواضيع
  importantInfo: new Set(), // معلومات مهمة
  
  // إضافة ذاكرة تعليمية
  educationalContext: new Map(), // سياق المحادثة التعليمي
  
  addMessage(message, sender) {
    // إضافة للذاكرة قصيرة المدى
    this.shortTerm.push({ message, sender, timestamp: Date.now() });
    if (this.shortTerm.length > 4) {
      // نقل الرسائل القديمة للذاكرة طويلة المدى
      const oldMessage = this.shortTerm.shift();
      this.longTerm.push(oldMessage);
      
      // تحليل وتصنيف الرسائل
      this.analyzeMessage(oldMessage);
    }
  },
  
  analyzeMessage(messageObj) {
    const { message, sender } = messageObj;
    
    // تصنيف المواضيع
    const topics = this.extractTopics(message);
    topics.forEach(topic => {
      if (!this.topics.has(topic)) {
        this.topics.set(topic, []);
      }
      this.topics.get(topic).push(messageObj);
    });
    
    // استخراج معلومات مهمة
    const importantInfo = this.extractImportantInfo(message);
    importantInfo.forEach(info => this.importantInfo.add(info));
  },
  
  extractTopics(message) {
    // تحليل بسيط للمواضيع
    const topics = [];
    if (message.includes('تكنولوجيا') || message.includes('تعليم')) {
      topics.push('تكنولوجيا التعليم');
    }
    if (message.includes('مواد') || message.includes('دراسية')) {
      topics.push('المواد الدراسية');
    }
    // يمكن إضافة المزيد من التصنيفات
    return topics;
  },
  
  extractImportantInfo(message) {
    // استخراج معلومات مهمة مثل التواريخ والأسماء
    const importantInfo = [];
    const dateRegex = /\d{4}\/\d{4}|\d{4}-\d{4}/g;
    const dates = message.match(dateRegex);
    if (dates) importantInfo.push(...dates);
    
    // يمكن إضافة المزيد من الأنماط
    return importantInfo;
  },
  
  // تحليل المحتوى التعليمي
  analyzeEducationalContent(message) {
    const concepts = this.extractConcepts(message);
    concepts.forEach(concept => {
      if (!this.educationalContext.has(concept)) {
        this.educationalContext.set(concept, {
          mentions: 0,
          lastMentioned: null,
          relatedQuestions: []
        });
      }
      const context = this.educationalContext.get(concept);
      context.mentions++;
      context.lastMentioned = Date.now();
    });
  },
  
  // استخراج المفاهيم من النص
  extractConcepts(text) {
    // يمكن تحسين هذه الدالة باستخدام خوارزميات أكثر تطوراً
    const concepts = [];
    for (const [concept] of educationalMemory.concepts) {
      if (text.includes(concept)) {
        concepts.push(concept);
      }
    }
    return concepts;
  },
  
  // الحصول على السياق التعليمي المناسب
  getEducationalContext(userMessage) {
    const concepts = this.extractConcepts(userMessage);
    const context = [];
    
    concepts.forEach(concept => {
      const conceptDetails = educationalMemory.concepts.get(concept);
      if (conceptDetails) {
        context.push({
          concept,
          definition: conceptDetails.definition,
          examples: educationalMemory.examples.get(concept) || [],
          relatedQuestions: educationalMemory.questions.get(concept) || []
        });
      }
    });
    
    return context;
  },
  
  getRelevantContext(userMessage) {
    // البحث عن سياق ذو صلة
    const topics = this.extractTopics(userMessage);
    let relevantContext = [];
    
    topics.forEach(topic => {
      if (this.topics.has(topic)) {
        relevantContext = relevantContext.concat(this.topics.get(topic));
      }
    });
    
    return relevantContext;
  }
};

// تحسين محلل الأسئلة
const questionAnalyzer = {
  classifyQuestion(message) {
    const categories = {
      academic: ['مواد', 'دراسية', 'منهج', 'مقرر'],
      administrative: ['مواعيد', 'تسجيل', 'شروط', 'قبول'],
      general: ['معلومات', 'تعريف', 'معنى']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return category;
      }
    }
    return 'general';
  },
  
  getSuggestedQuestions(category) {
    const suggestions = {
      academic: [
        'ما هي المواد الدراسية في الفرقة الأولى؟',
        'كيف يتم توزيع المواد على الفصول الدراسية؟'
      ],
      administrative: [
        'ما هي شروط القبول في القسم؟',
        'كيف يمكنني التسجيل في المواد الاختيارية؟'
      ],
      general: [
        'ما هو تعريف تكنولوجيا التعليم؟',
        'ما هي مجالات العمل المتاحة بعد التخرج؟'
      ]
    };
    return suggestions[category] || [];
  },
  
  // تحليل أعمق للأسئلة
  analyzeQuestionDepth(message) {
    const depthKeywords = {
      basic: ['ما هو', 'تعريف', 'اشرح', 'وضح'],
      intermediate: ['كيف', 'لماذا', 'قارن', 'فرق'],
      advanced: ['حلل', 'ناقش', 'قيم', 'نقد']
    };
    
    for (const [depth, keywords] of Object.entries(depthKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return depth;
      }
    }
    return 'basic';
  },
  
  // تحديد المفاهيم في السؤال
  identifyConcepts(message) {
    return conversationMemory.extractConcepts(message);
  },
  
  // اقتراح أسئلة متابعة
  suggestFollowUpQuestions(concepts, depth) {
    const suggestions = [];
    concepts.forEach(concept => {
      const questions = educationalMemory.questions.get(concept) || [];
      const relevantQuestions = questions.filter(q => 
        this.analyzeQuestionDepth(q.question) === depth
      );
      suggestions.push(...relevantQuestions.map(q => q.question));
    });
    return suggestions.slice(0, 3); // إرجاع 3 أسئلة كحد أقصى
  }
};

// نظام التعلم التلقائي من المحادثات
const learningSystem = {
  // تخزين المعلومات المكتسبة
  learnedKnowledge: new Map(),
  // تتبع جودة الإجابات
  answerQuality: new Map(),
  // تتبع الأسئلة المتكررة
  frequentQuestions: new Map(),
  
  // تحليل وتخزين معلومات جديدة
  learnFromInteraction(userMessage, botResponse, userFeedback = null) {
    // تحليل السؤال والإجابة
    const concepts = this.extractNewConcepts(userMessage, botResponse);
    const questionPattern = this.analyzeQuestionPattern(userMessage);
    
    // تخزين المعلومات الجديدة
    concepts.forEach(concept => {
      if (!this.learnedKnowledge.has(concept.term)) {
        this.learnedKnowledge.set(concept.term, {
          definition: concept.definition,
          context: concept.context,
          examples: [],
          confidence: 0.5, // مستوى الثقة الأولي
          sources: new Set(['user_interaction']),
          lastUpdated: Date.now()
        });
      } else {
        // تحديث المعلومات الموجودة
        const existing = this.learnedKnowledge.get(concept.term);
        existing.confidence = (existing.confidence + 0.1) / 2; // زيادة الثقة تدريجياً
        existing.lastUpdated = Date.now();
        if (concept.definition) {
          existing.definition = concept.definition;
        }
      }
    });
    
    // تخزين نمط السؤال
    if (questionPattern) {
      const patternKey = questionPattern.type;
      if (!this.frequentQuestions.has(patternKey)) {
        this.frequentQuestions.set(patternKey, {
          pattern: questionPattern,
          count: 1,
          lastAsked: Date.now()
        });
      } else {
        const existing = this.frequentQuestions.get(patternKey);
        existing.count++;
        existing.lastAsked = Date.now();
      }
    }
    
    // تحديث جودة الإجابات
    if (userFeedback !== null) {
      this.updateAnswerQuality(userMessage, botResponse, userFeedback);
    }
  },
  
  // استخراج مفاهيم جديدة من المحادثة
  extractNewConcepts(userMessage, botResponse) {
    const concepts = [];
    const text = userMessage + ' ' + botResponse;
    
    // تحليل النص للبحث عن تعريفات جديدة
    const definitionPatterns = [
      /(?:هو|تعريف|يعني|يشير إلى)\s*([^.,:]+)/g,
      /(?:يمكن تعريف|يمكن وصف)\s*([^.,:]+)\s*(?:بأنه|على أنه)\s*([^.,:]+)/g
    ];
    
    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && !educationalMemory.concepts.has(match[1].trim())) {
          concepts.push({
            term: match[1].trim(),
            definition: match[2] ? match[2].trim() : null,
            context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50)
          });
        }
      }
    });
    
    return concepts;
  },
  
  // تحليل نمط السؤال
  analyzeQuestionPattern(question) {
    const patterns = {
      definition: /(?:ما هو|ما تعريف|ما معنى|اشرح|وضح)\s*([^؟?]+)/,
      comparison: /(?:قارن|ما الفرق|ما العلاقة)\s*(?:بين)?\s*([^؟?]+)/,
      example: /(?:اعط|اذكر|وضح)\s*(?:مثال|امثلة)\s*(?:على|لـ)?\s*([^؟?]+)/,
      how: /(?:كيف|كيفية|طريقة)\s*([^؟?]+)/
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = question.match(pattern);
      if (match) {
        return {
          type,
          subject: match[1].trim(),
          originalQuestion: question
        };
      }
    }
    
    return null;
  },
  
  // تحديث جودة الإجابات
  updateAnswerQuality(question, answer, feedback) {
    const key = question + '|' + answer;
    if (!this.answerQuality.has(key)) {
      this.answerQuality.set(key, {
        question,
        answer,
        feedback: [feedback],
        averageQuality: feedback,
        count: 1
      });
    } else {
      const existing = this.answerQuality.get(key);
      existing.feedback.push(feedback);
      existing.averageQuality = existing.feedback.reduce((a, b) => a + b) / existing.feedback.length;
      existing.count++;
    }
  },
  
  // الحصول على إجابة محسنة
  getImprovedAnswer(question) {
    const pattern = this.analyzeQuestionPattern(question);
    if (!pattern) return null;
    
    // البحث عن إجابات سابقة عالية الجودة
    let bestAnswer = null;
    let bestQuality = 0;
    
    for (const [key, data] of this.answerQuality) {
      if (data.question.includes(pattern.subject) && data.averageQuality > bestQuality) {
        bestAnswer = data.answer;
        bestQuality = data.averageQuality;
      }
    }
    
    return bestAnswer;
  },
  
  // الحصول على معلومات مكتسبة
  getLearnedKnowledge(term) {
    return this.learnedKnowledge.get(term);
  },
  
  // الحصول على الأسئلة المتكررة
  getFrequentQuestions() {
    return Array.from(this.frequentQuestions.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }
};

// Send message to API
async function sendMessageToAPI(message) {
  addTypingMessage();
  
  try {
    // تحليل السؤال
    const questionCategory = questionAnalyzer.classifyQuestion(message);
    const suggestedQuestions = questionAnalyzer.getSuggestedQuestions(questionCategory);
    
    // البحث عن إجابة محسنة من التعلم السابق
    const improvedAnswer = learningSystem.getImprovedAnswer(message);
    
    // الحصول على السياق ذو الصلة
    const relevantContext = conversationMemory.getRelevantContext(message);
    
    // تحديث الذاكرة
    conversationMemory.addMessage(message, 'user');
    
    const conversationContext = relevantContext
      .map(entry => `${entry.sender === "user" ? "المستخدم" : "المساعد"}: ${entry.message}`)
      .join("\n");

    // إضافة معلومات التعلم المكتسبة إلى السياق
    const learnedContext = Array.from(learningSystem.learnedKnowledge.entries())
      .filter(([term, data]) => message.includes(term))
      .map(([term, data]) => `${term}: ${data.definition}`)
      .join("\n");

    const systemPrompt = `
أنت مساعد ذكي شامل قادر على الإجابة عن الأسئلة المتعلقة بقسم تكنولوجيا التعليم بكلية التربية النوعية بجامعة المنيا، وأيضًا على الأسئلة العامة في مختلف المجالات بناءً على معرفتك الواسعة. اسمك "مساعدك الذكي ".
– خذي نفسك بهذا المعلومات عن القسم لتستطيع الاجاابة بشكل دقيق اذا سالت عن القسم 
معلومات شاملة عن كلية التربية النوعية جامعة المنيا قسم تكنولوجيا التعليم1. مقدمة عن كلية التربية النوعية وقسم تكنولوجيا التعليم بجامعة المنياتعتبر كلية التربية النوعية بجامعة المنيا إحدى المؤسسات الأكاديمية الهامة ضمن منظومة التعليم العالي في جمهورية مصر العربية.1 وتعود نشأة هذه الكلية إلى عام 1991، حيث بدأت مسيرتها في مبنى دار المعلمين بمدينة المنيا.4 وقد صدر القرار الوزاري رقم 953 في نفس العام ليضع الكلية تحت إشراف وزارة التعليم العالي.4 وفي خطوة لاحقة تعكس التطور المؤسسي، صدر القرار الجمهوري رقم 329 لسنة 1998، والذي بموجبه انتقلت تبعية الكلية لتصبح جزءًا لا يتجزأ من جامعة المنيا.4 وقد شهد العام الجامعي 1990/1991 انطلاق الدراسة في الكلية، مما يشير إلى فترة من الإعداد والتأسيس قبل الاندماج الرسمي تحت مظلة الجامعة.4إن انتقال الكلية من الإشراف المباشر لوزارة التعليم العالي إلى جامعة المنيا يمثل تحولًا استراتيجيًا نحو دمج التعليم النوعي المتخصص ضمن إطار الجامعة الأوسع.4 هذا التكامل يمكن أن يعزز تبادل الموارد، ويشجع التعاون الأكاديمي بين مختلف الكليات، ويسهم في الاعتراف ببرامج الكلية على نطاق أوسع. كما أن البداية في دار المعلمين تلمح إلى تركيز تاريخي، وربما مستمر، على إعداد المعلمين والتنمية التعليمية.4 هذه الخلفية التاريخية ضرورية لفهم الهوية الأساسية للكلية ودورها الرئيسي في المشهد التعليمي بالمنطقة.على الرغم من عدم توفر بيان رسمي لرؤية ورسالة وأهداف قسم تكنولوجيا التعليم بجامعة المنيا في المصادر المتاحة بشكل مباشر، يمكن استنباط بعض الدلالات من المعلومات المتعلقة بالكلية وأقسام مماثلة في مؤسسات تعليمية أخرى.5 تشير الصفحة الرئيسية للموقع الرسمي لكلية التربية النوعية بجامعة المنيا إلى وجود قسم علمي متخصص في "Instructional Technology" (تكنولوجيا التعليم).5 وبالإضافة إلى ذلك، يوضح الموقع أن الكلية تضم خمسة أقسام علمية، من بينها قسم تكنولوجيا التعليم.5 وعند النظر إلى أقسام تكنولوجيا التعليم في جامعات أخرى مثل جامعة أسوان وجامعة بنها وجامعة الفيوم، نجد أن الأهداف المشتركة تتمحور حول إعداد متخصصين في مجال تكنولوجيا التعليم قادرين على تطوير العملية التعليمية من خلال تصميم وإنتاج واستخدام الوسائل التعليمية الحديثة وتوظيف التكنولوجيا في معالجة التحديات التعليمية.6 كما تهدف هذه الأقسام إلى تغيير الممارسات التربوية القائمة لدمج التكنولوجيا بشكل فعال في صلب عمليتي التعليم والتعلم، وتقديم برامج أكاديمية ذات جودة عالية.9بناءً على هذه الاتجاهات العامة في أقسام تكنولوجيا التعليم بالجامعات المصرية، من المرجح أن قسم تكنولوجيا التعليم بجامعة المنيا يسعى إلى تأهيل كوادر متخصصة في دمج التقنيات الحديثة في العملية التعليمية، وتنمية مهارات الطلاب في استخدام وتصميم الوسائل التعليمية الرقمية المتنوعة، والمساهمة في تحديث وتطوير أساليب التعليم. كما أن وجود القسم ضمن كلية للتربية النوعية يشير إلى اهتمام خاص بتطبيق التكنولوجيا في سياقات تعليمية محددة، ربما تتعلق بمجالات دراسية متنوعة أو احتياجات تعلم خاصة.52. البرامج الأكاديمية التي يقدمها قسم تكنولوجيا التعليميؤكد الموقع الرسمي لكلية التربية النوعية بجامعة المنيا أن قسم تكنولوجيا التعليم يقدم برنامجًا أكاديميًا واحدًا في مرحلة البكالوريوس، وهو برنامج "تكنولوجيا التعليم".10 يتميز هذا البرنامج بشموليته وعمقه، حيث يتضمن دراسة 78 مقررًا دراسيًا موزعة على أربع سنوات أكاديمية.10 وعند إتمام الطالب متطلبات البرنامج بنجاح، يُمنح درجة البكالوريوس مع تخصص في أحد المجالين التاليين: "أخصائي تكنولوجيا التعليم" أو "معلم الحاسب الآلي".10 ويتفق هذا مع ما ورد في مصادر أخرى تشير إلى أن كلية التربية النوعية بجامعة المنيا تضم أقسامًا تشمل "تكنولوجيا التعليم والحاسب الآلي"، مما يدعم فكرة وجود مسارين أو تخصصين ضمن هذا البرنامج.11 كما أن وجود "شعبة إعداد معلم الحاسب الآلي" كأحد الأقسام الرئيسية في كليات التربية النوعية الأخرى يعزز من احتمالية وجود هذا التخصص في جامعة المنيا.12إن وجود هذين التخصصين ضمن برنامج البكالوريوس يعكس التزام القسم بإعداد خريجين قادرين على تلبية الاحتياجات المتنوعة لسوق العمل في مجال تكنولوجيا التعليم.10 فمسار "أخصائي تكنولوجيا التعليم" يركز على الجوانب الأوسع لتصميم التعليم، وإنتاج الوسائل التعليمية، ودمج التكنولوجيا في العملية التعليمية بشكل عام. بينما يتناول مسار "معلم الحاسب الآلي" تطوير المهارات التربوية والتقنية اللازمة لتدريس علوم الحاسب في المراحل التعليمية المختلفة. كما أن العدد الكبير للمقررات الدراسية (78 مقررًا) يشير إلى منهج دراسي مفصل يهدف إلى تزويد الطلاب بأساس نظري قوي ومهارات عملية متعمقة في مختلف جوانب تكنولوجيا التعليم.10بالنسبة لبرامج الدراسات العليا، تشير المعلومات المتاحة إلى وجود بنية أساسية للدراسات العليا في كلية التربية النوعية بجامعة المنيا.13 يذكر الموقع الرسمي للكلية وجود دبلومة خاصة وتمهيدي ماجستير وتمهيدي دكتوراه في التربية النوعية.13 وعلى الرغم من أن هذه البرامج لا تحدد بشكل مباشر تخصص تكنولوجيا التعليم، إلا أنها تفتح الباب أمام إمكانية وجود برامج متخصصة في هذا المجال على مستوى الدراسات العليا. فمن الممارسات الشائعة في الجامعات أن تقدم الأقسام المتخصصة برامج للدراسات العليا في مجالات تخصصها. وبالنظر إلى وجود قسم تكنولوجيا التعليم وبرنامج البكالوريوس الخاص به، فمن المرجح أن الكلية تقدم أيضًا برامج للدراسات العليا في تكنولوجيا التعليم، مثل دبلوم خاص في تكنولوجيا التعليم، وماجستير في تكنولوجيا التعليم، ودكتوراه في تكنولوجيا التعليم. ويمكن الحصول على معلومات أكثر دقة حول هذه البرامج من خلال زيارة الموقع الرسمي للكلية أو التواصل المباشر مع القسم.3. المواد الدراسية والمناهج الدراسية لقسم تكنولوجيا التعليميوفر الملخص 15 قائمة جزئية بالمواد الدراسية التي يتم تدريسها في قسم تكنولوجيا التعليم بجامعة المنوفية. وعلى الرغم من أن هذه القائمة لا تنتمي مباشرة إلى جامعة المنيا، إلا أنها يمكن أن تقدم تصورًا عامًا عن أنواع المواد التي قد يشملها برنامج تكنولوجيا التعليم في جامعة المنيا. تتضمن هذه المواد مقررات تأسيسية في مجال الحاسبات والبرمجة، بالإضافة إلى مقررات متخصصة في إنتاج الوسائل التعليمية المختلفة، واستخدام المكتبات ومصادر المعلومات، ومبادئ علم النفس التربوي. فعلى سبيل المثال، تشمل مواد الفرقة الأولى مقدمة في الحاسبات والبرمجة، وأساسيات إنتاج الرسومات التعليمية، والأذاعة والتسجيلات الصوتية، ومبادئ التربية وعلم النفس.15 أما مواد الفرقة الثانية فتتضمن الحاسب الآلي (استخدام نوافذ وبيسيك متقدم)، وإنتاج الصور الضوئية والرسوم التعليمية، وأجهزة العرض، ومقدمة في الوسائط المتعددة.15تشير المعلومات المتاحة بشكل مباشر من جامعة المنيا إلى وجود جداول دراسية مفصلة لقسم تكنولوجيا التعليم للفصل الدراسي الثاني من العام الجامعي 2024/2025.16 هذه الجداول متاحة للتحميل لكل فرقة دراسية على حدة: الفرقة الأولى، الفرقة الثانية، الفرقة الثالثة تكنولوجيا، الفرقة الثالثة حاسب آلي، الفرقة الرابعة تكنولوجيا، والفرقة الرابعة حاسب آلي.16 ويؤكد الملخص 16 أن هذه الجداول لا تتضمن أسماء المواد الدراسية بشكل صريح، ولكن يمكن معرفة هذه المواد من خلال تحميل جداول كل فرقة. إن وجود جداول منفصلة لمساري "تكنولوجيا" و "حاسب آلي" في الفرقتين الثالثة والرابعة يعزز من فكرة وجود تخصصين متميزين ضمن برنامج البكالوريوس، حيث من المرجح أن يركز طلاب تخصص "تكنولوجيا" على جوانب تصميم التعليم والوسائل التعليمية، بينما يتعمق طلاب تخصص "حاسب آلي" في علوم الحاسب وطرق تدريسها.لم يتم العثور على وصف تفصيلي مباشر لمحتوى المناهج وأهدافها للمواد الدراسية في قسم تكنولوجيا التعليم بجامعة المنيا في الملخصات المتاحة. ومع ذلك، يقدم الملخص 7 من جامعة بنها أمثلة على الأهداف التعليمية التي يسعى برنامج تكنولوجيا التعليم إلى تحقيقها، مثل تزويد الطلاب بالمعارف والمفاهيم الأساسية للتكنولوجيا التعليمية، وإكسابهم مهارات البرمجة، وتزويدهم بالأسس التربوية والفنية والنفسية لتصميم وإنتاج المواد التعليمية، وتعليمهم كيفية تقييم التعلم. كما يذكر الملخص 8 بعض المواد الدراسية التي يتم تدريسها في قسم تكنولوجيا التعليم بجامعة الفيوم كمثال، مثل تصميم المواقف التعليمية، والتربية العملية، والبرمجة باستخدام البرامج الجاهزة، ومشكلات الحاسب، وصيانة أجهزة العرض. هذه الأمثلة من جامعات أخرى تشير إلى أن المناهج الدراسية في قسم تكنولوجيا التعليم بجامعة المنيا من المرجح أن تهدف إلى تزويد الطلاب بالمعرفة النظرية والمهارات العملية في مجالات تصميم التعليم، وإنتاج الوسائل التعليمية، وتطبيقات الحاسب في التعليم، وتقنيات التقييم. كما يشير الملخص 18 إلى وجود مقررات لبرنامج كلية التربية النوعية (تكنولوجيا التعليم الرقمي) في مركز التعلم المدمج بجامعة المنيا، مع توفير رابط للاطلاع على هذه المقررات، مما قد يدل على توجه نحو دمج التعلم الرقمي في المناهج الدراسية.4. أعضاء هيئة التدريس بقسم تكنولوجيا التعليميشير الملخص 10 إلى وجود رابط لقائمة أعضاء هيئة التدريس بقسم تكنولوجيا التعليم بجامعة المنيا (http://departments.minia.edu.eg/Home/AllMembers). ومع ذلك، فقد ذكر الملخص أن المعلومات المطلوبة غير متوفرة في الوثيقة. (ملاحظة: قد يكون هذا الرابط غير فعال أو يحتاج إلى تحديث).بالرغم من ذلك، يوفر الملخص 19 قائمة بأسماء بعض أعضاء هيئة التدريس بقسم تكنولوجيا التعليم مع عناوين بريدهم الإلكتروني، مما يتيح وسيلة مباشرة للتواصل معهم. تشمل هذه الأسماء: شيماء سمير محمد خليل (shaimaa_smr@mu.edu.eg)، وسعودي صالح عبد العليم حسن (soudysaleh@mu.edu.eg)، وأدهم كامل نصر حسين محمد (adham_kamel@mu.edu.eg)، وأسماء سيد محمد علي (asmaa_mohamad1@mu.edu.eg)، ورزق على احمد محمد (comunicatall@mu.edu.eg)، وزينب محمد أمين خليل (zub_amin@mu.edu.eg)، وعماد احمد سيد سالم (emadtech@mu.edu.eg)، وعمرو محمد احمد القشيرى (al_koshiry@mu.edu.eg)، ومحمد يوسف احمد على كفافى (drmohamedkefafe@mu.edu.eg)، وممدوح عبد الحميد ابراهيم عبد الغنى (drmamdouhteci@mu.edu.eg)، ووفاء صلاح الدين ابراهيم الدسوقى (wseldessouki222@mu.edu.eg)، وتسنيم صفوت احمد علي (tasneem.safwaat@mu.edu.eg)، وايه عبد الباقي محمد عبد الباقي (ayaabdelbaki@mu.edu.eg).يذكر الملخص 20 أن الدكتورة إيمان الشريف هي مدرس تكنولوجيا التعليم والحاسب الآلي ورئيس قسم تكنولوجيا التعليم بكلية التربية النوعية جامعة المنيا. كما أنها تشغل منصب مدير وحدة تكنولوجيا المعلومات (الخدمات الالكترونية) بالكلية وعضو مجلس إدارة مركز تنمية قدرات أعضاء هيئة التدريس والقيادات بالجامعة. ويشير الملخص 21 إلى أن الدكتور سعودي صالح هو أستاذ مساعد تكنولوجيا التعليم بكلية التربية النوعية جامعة المنيا، مع اهتمامات بحثية في تكنولوجيا التعليم والتعليم الإلكتروني. كما يوفر الملخص 22 معلومات عن الدكتور محمد ضاحي محمد توني كأستاذ مساعد تكنولوجيا التعليم بنفس الكلية، مع اهتمامات بحثية مماثلة. ويذكر الملخص 23 عنوان البريد الإلكتروني للدكتورة زينب محمد أمين (znb_amin@yahoo.com)، والتي يشير الملخص 24 إلى أنها أستاذ تكنولوجيا التعليم وعميد كلية التربية النوعية سابقًا بالمنيا.إن توفر هذه القائمة بأسماء أعضاء هيئة التدريس وعناوين بريدهم الإلكتروني يمثل مصدرًا قيمًا لمن يرغب في التواصل مع القسم أو أعضائه. كما أن الأدوار القيادية التي تشغلها الدكتورة إيمان الشريف، والاهتمامات البحثية للدكتور سعودي صالح والدكتور محمد ضاحي محمد توني في مجال التعليم الإلكتروني، تشير إلى نقاط قوة وتخصص داخل القسم.5. الأنشطة البحثية والمشاريع بقسم تكنولوجيا التعليميسلط الملخص 25 الضوء على بعض الأبحاث التي أجريت في كلية التربية النوعية، والتي لها صلة مباشرة بقسم تكنولوجيا التعليم. على سبيل المثال، يتناول بحث الدكتورة إيمان زكي الشريف موضوع "القصة الرقمية التعليمية" وتأثيرها على مهارات التفكير والتحصيل المعرفي لدى الطلاب. كما يتضمن أبحاثًا أخرى للدكتورة إيناس محمد الحسيني حول تأثير أنماط التدريب الإلكتروني على مهارات استخدام الأجهزة التفاعلية لدى طلاب تكنولوجيا التعليم. ويؤكد الملخص 25 أيضًا على هذه الأبحاث للدكتورة إيمان زكي الشريف والدكتورة إيناس محمد الحسيني، مما يشير إلى نشاطهما البحثي المستمر.يوفر الملخصان 21 و 22 روابط لصفحات الباحث العلمي للدكتور سعودي صالح والدكتور محمد ضاحي محمد توني، حيث يمكن الاطلاع على منشوراتهما البحثية في مجالات حديثة مثل التعلم الإلكتروني واستخدام الفيديو في التعليم، وتنمية كفاءات الموارد التعليمية المفتوحة المصادر. كما يذكر الملخص 6 مناقشة رسالة دكتوراه في قسم تكنولوجيا التعليم بجامعة أسوان، والتي تتناول موضوع استخدام التكنولوجيا في تنمية مهارات الطلاب، مما يعطي فكرة عن طبيعة الأبحاث التي قد تجرى في قسم تكنولوجيا التعليم بجامعة المنيا.توضح هذه الأمثلة من الأبحاث والمنشورات أن أعضاء هيئة التدريس بقسم تكنولوجيا التعليم بجامعة المنيا منخرطون بنشاط في البحث العلمي في مجالات حديثة مثل التعلم الرقمي واستخدام الوسائل التكنولوجية في تطوير العملية التعليمية. كما أن وجود صفحات على الباحث العلمي لبعض أعضاء هيئة التدريس يعزز من إمكانية الوصول إلى أعمالهم البحثية.6. آخر الأخبار والإعلانات المتعلقة بقسم تكنولوجيا التعليميذكر الملخص 25 بعض الأخبار المتعلقة بكلية التربية النوعية بشكل عام، مثل إعلانات توزيع لجان الاختبار الشفوي لمادة التدريب الميداني للفصل الدراسي الثاني للعام الجامعي 2024/2025. كما يشير الملخص 26 إلى خبر يتعلق بتعيين الدكتورة إيمان زكي موسى الشريف، الأستاذ بقسم تكنولوجيا التعليم، للقيام بأعمال عميد كلية التربية النوعية خلال العام الجامعي 2023/2024. هذا التعيين يعكس الدور الهام الذي يلعبه أعضاء القسم في قيادة الكلية.تعرض قناة يوتيوب الرسمية لكلية التربية النوعية جامعة المنيا 17 مقاطع فيديو حول فعاليات وأنشطة الكلية، بما في ذلك كلمة لعميد الكلية أثناء مشروع تخرج طلاب قسم تكنولوجيا التعليم. هذه القناة يمكن أن تكون مصدرًا قيمًا للأخبار والمعلومات المرئية حول القسم والكلية. كما يذكر الملخص 6 أخبارًا من قسم تكنولوجيا التعليم بجامعة أسوان، مثل مناقشة رسالة دكتوراه ودعوة لحضور رسالة ماجستير، مما يدل على أنواع الأنشطة التي قد يقوم بها قسم تكنولوجيا التعليم في جامعة المنيا.تشير هذه الأخبار إلى وجود أنشطة أكاديمية وإدارية مستمرة في الكلية والقسم. ويمكن الحصول على أحدث الإعلانات والأخبار المتعلقة بقسم تكنولوجيا التعليم بجامعة المنيا من خلال متابعة الموقع الرسمي للكلية وقناتها على يوتيوب.7. معلومات الاتصال بقسم تكنولوجيا التعليميوفر الملخص 4 رقم هاتف عميد الكلية وهو 2346523 (086) وفاكس بنفس الرقم. كما يذكر عنوان الكلية وهو جامعة المنيا – حي شلبي – مدينة المنيا – محافظة المنيا، ص ب 61519.4 بالإضافة إلى ذلك، يوفر الملخص 4 عنوان البريد الإلكتروني لعميد الكلية وهو znb_amin@yahoo.com.يقدم الملخص 19 قائمة بعناوين البريد الإلكتروني لعدد من أعضاء هيئة التدريس بقسم تكنولوجيا التعليم، مما يتيح التواصل المباشر معهم. كما يذكر الملخص 23 العنوان البريدي لقسم تكنولوجيا التعليم بكلية التربية النوعية جامعة المنيا، بما في ذلك صندوق البريد (ص ب:61519 61519)، وعنوان البريد الإلكتروني لرئيس القسم سابقًا (الدكتورة زينب محمد أمين) وهو znb_amin@yahoo.com.توفر هذه المعلومات قنوات متعددة للتواصل مع الكلية وقسم تكنولوجيا التعليم، سواء عبر الهاتف أو البريد الإلكتروني أو البريد العادي.الخلاصةيقدم قسم تكنولوجيا التعليم بكلية التربية النوعية بجامعة المنيا برنامجًا شاملاً في مرحلة البكالوريوس مع تخصصين رئيسيين هما أخصائي تكنولوجيا التعليم ومعلم الحاسب الآلي. يشير وجود جداول دراسية منفصلة لهذين التخصصين في السنوات المتقدمة إلى منهج دراسي متخصص لكل مسار. على الرغم من عدم توفر تفاصيل كاملة حول المواد الدراسية وأهدافها في المصادر المتاحة، إلا أن أمثلة من جامعات أخرى تشير إلى تركيز على الجوانب النظرية والتطبيقية لتكنولوجيا التعليم. يضم القسم نخبة من أعضاء هيئة التدريس ذوي الخبرة والاهتمام بمجالات بحثية حديثة مثل التعليم الإلكتروني والوسائل التعليمية الرقمية، كما يتضح من منشوراتهم وأنشطتهم البحثية. يمكن الحصول على أحدث الأخبار والإعلانات ومعلومات الاتصال التفصيلية من خلال زيارة الموقع الرسمي لكلية التربية النوعية بجامعة المنيا وقناتها على يوتيوب.الجدول 1: قائمة بالمواد الدراسية لبرنامج البكالوريوس (مثال من جامعة المنوفية)كود المادةاسم المادة (العربية)Subject Name (English)الفرقةالفصل الدراسيA11A01مقدمة الحاسباتIntroduction to ComputersالأولىالأولA11A02مقدمة البرمجة (1)Introduction to Programming 1الأولىالأولA11A03أساسيات إنتاج الرسومات التعليميةLearning the basics of production drawingsالأولىالأولA11A04المتاحف والمعارض التعليميةMuseums and galleries educationalالأولىالأولA11A05رياضيات الحاسباتMathematics ComputersالأولىالأولA11A06الأذاعة والتسجيلات الصوتيةRadio and sound recordingsالأولىالأولA11A07مبادئ التربيةPrinciples of EducationالأولىالأولA11A08قراءات باللغة العربيةReadings in ArabicالأولىالأولA11A09دراسات بيئيةEnvironmental studiesالأولىالأولA12A01مقدمة فى البرمجة (2)Introduction to Programming 2الأولىالثانيA12A02أساسيات التصوير الضوئىBasics of PhotographyالأولىالثانيA12A03مدخل إلى تكنولوجيا التعليمIntroduction to Educational TechnologyالأولىالثانيA12A04الإحصاء التطبيقى بالحاسب الآلىStatistics Applied ComputerالأولىالثانيA12A05المصغرات الفيلميةMicrofilmsالأولىالثانيA12A06الفهرسة الوصفيةIndexing metadataالأولىالثانيA12A07الطباعة والنسخ والتجليدPrinting copying and bindingالأولىالثانيA12A08مبادىء علم النفسPrinciples of PsychologyالأولىالثانيA12A09قراءات باللغة الإنجليزيةReadings in EnglishالأولىالثانيB21A01الحاسب الآلى (استخدام نوافذ)Computer using windowsالثانيةالأولB21A02انتاج الصور الضوئيةProduction photographsالثانيةالأولB21A03انتاج رسوم تعليمية (1)Production of educational feesالثانيةالأولB21A04المراجع العامة والخاصةAuditor General and privateالثانيةالأولB21A05أجهزة عرض (تشغيل واستخدام)Projectors operation and useالثانيةالأولB21A06مكتبات شاملةComprehensive librariesالثانيةالأولB21A07مبادىء تدريسPrinciples of teachingالثانيةالأولB21A08علم نفس النموDevelopmental PsychologyالثانيةالأولB21A09قراءات باللغة الأجنبيةReadings in a foreign languageالثانيةالأولB22A01الحاسب الآلى (بيسيك متقدم)Computer Advanced BASICالثانيةالثانيB22A02مقدمة فى الوسائط المتعددةIntroduction to Multimediaالثانيةالثانيملاحظة: هذا الجدول يمثل مواد جامعة المنوفية كمثال توضيحي. جداول المواد الدراسية لقسم تكنولوجيا التعليم بجامعة المنيا متاحة للتحميل على الموقع الرسمي للكلية لكل فرقة دراسية (الأولى، الثانية، الثالثة تكنولوجيا، الثالثة حاسب آلي، الرابعة تكنولوجيا، الرابعة حاسب آلي).16الجدول 2: قائمة بأعضاء هيئة التدريس بقسم تكنولوجيا التعليم ومعلومات الاتصال (جامعة المنيا)اسم عضو هيئة التدريس (العربية)التخصص (إذا ذكر)البريد الإلكتروني، شيماء سمير محمد خليلshaimaa_smr@mu.edu.egسعودي صالح عبد العليم حسنأستاذ مساعد تكنولوجيا التعليمsoudysaleh@mu.edu.egأدهم كامل نصر حسين محمدadham_kamel@mu.edu.egأسماء سيد محمد عليasmaa_mohamad1@mu.edu.egرزق على احمد محمدcomunicatall@mu.edu.egزينب محمد أمين خليلأستاذ تكنولوجيا التعليمzub_amin@mu.edu.egعماد احمد سيد سالمemadtech@mu.edu.egعمرو محمد احمد القشيرىal_koshiry@mu.edu.egمحمد يوسف احمد على كفافىdrmohamedkefafe@mu.edu.egممدوح عبد الحميد ابراهيم عبد الغنىdrmamdouhteci@mu.edu.egوفاء صلاح الدين ابراهيم الدسوقىwseldessouki222@mu.edu.egتسنيم صفوت احمد عليtasneem.safwaat@mu.edu.egايه عبد الباقي محمد عبد الباقيayaabdelbaki@mu.edu.egإيمان الشريفمدرس تكنولوجيا التعليم والحاسب الآليغير متوفرمحمد ضاحي محمد تونيأستاذ مساعد تكنولوجيا التعليمغير متوفرزينب محمد أمين (عميد سابق)أستاذ تكنولوجيا التعليمznb_amin@yahoo.comاحمد سعيد عبد الخالق (عميد حالي)znb_amin@yahoo.comملاحظة: يشغل الدكتور إيمان الشريف حاليًا منصب عميد كلية التربية النوعية ومدير وحدة تكنولوجيا المعلومات بالكلية ورئيس قسم تكنولوجيا التعليم. الدكتور سعودي صالح والدكتور محمد ضاحي محمد توني هما أساتذة مساعدون متخصصون في تكنولوجيا التعليم والتعليم الإلكتروني.
- اذا سالت عن اي معلومات عامة لا تستعن بالاجابات التي هنا واستعن باجاباتك انت العامة
- أنت مساعد ذكي اسمه "AI". حافظ على سجلّ المحادثة بشكل مختصر (آخر سؤالين أو ثلاث أسئلة). لما المستخدم يرجع يسأل عن حاجة اتكلّمت فيها قبل كدة، اذكر النقاط الرئيسية بس من غير إعادة كاملة.دايمًا اسأل أسئلة توضيحية لو السؤال مش واضح. 
- انت مساعدك الذكي، ودود وخبير. تبدأ كل ردّ بتحية خفيفة (مثلاً: أهلاً يا باشا/أهلًا وسهلًا)،- لا ترد بجملة اهلا وسهلا في كل مرة تجاوب فيها رد فقط اول مرة وخلاص
  وبتختم بنصيحة صغيرة أو رابط لمصدر إضافي لو متوفر. 
أسلوبك بسيط وجذاب، وتستخدم أمثلة واقعية من جامعة المنيا أو مشاريع تعليمية.
- لا تذكر بعد كل رساله ان لا يوجد سجل محادثة احتفظ به لنفسك ولا تظهرها
- اذا عطاك المستخدم اسئله غير واضحة حاول فهمها ولا تقو له ان السوال غير واضح الا للضرورة 
- لا تذكر المستخدم في كل مرة اشياء مثل بناء علي اسئلتك السابقة او بناء علي الاجابة السابق
– إذا سُئلت عن مطورك أو من قام بإنشائك، اجب بناء علي فهمك لهذا النص هنا:
"${developerInfoAnswer}"

– إذا سُئلت عن مصدر معلوماتك، أجب:
"${sourceInfoAnswer}"

– إذا جاء سؤال خارج نطاق معلومات القسم، قدم إجابة واضحة ومفيدة اعتمادًا على معرفتك العامة، واذكر أمثلة أو مصادر موثوقة عند الضرورة.

تحدث بأسلوب ودود ورسمي مناسب لبيئة جامعية، واحرص على أن يكون الرد موجزًا وواضحًا.
--- معلومات أساسية عن القسم ---
${departmentInfo}
--- المحادثة السابقة ---
${conversationContext || "لا يوجد سجل محادثة بعد."}
--- سؤال المستخدم ---


${message}
          `;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
      }),
    });

    removeTypingMessage();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (botReply) {
      // تعلم من التفاعل
      learningSystem.learnFromInteraction(message, botReply);
      
      addMessage(botReply, "bot");
      conversationHistory.push({ sender: "bot", text: botReply });
      
      // إضافة أزرار التقييم
      addFeedbackButtons(message, botReply);
    } else {
      addMessage("عذراً، لم أتمكن من معالجة الرد من الخادم.", "bot");
    }
  } catch (error) {
    removeTypingMessage();
    console.error("Error calling Gemini API:", error);
    addMessage(`حدث خطأ أثناء محاولة الحصول على رد. (${error.message})`, "bot");
  } finally {
    sendButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// إضافة أزرار التقييم للرسائل
function addFeedbackButtons(question, answer) {
  const messageElement = document.querySelector('.bot-message:last-child');
  if (!messageElement) return;
  
  const feedbackDiv = document.createElement('div');
  feedbackDiv.className = 'feedback-buttons';
  
  const helpfulBtn = document.createElement('button');
  helpfulBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> مفيد';
  helpfulBtn.title = 'هل كانت هذه الإجابة مفيدة؟';
  helpfulBtn.onclick = () => {
    learningSystem.learnFromInteraction(question, answer, 1);
    helpfulBtn.classList.add('rated');
    notHelpfulBtn.style.display = 'none';
    // إضافة رسالة تأكيد
    const confirmation = document.createElement('span');
    confirmation.textContent = 'شكراً على تقييمك!';
    confirmation.style.marginLeft = '10px';
    confirmation.style.color = '#4caf50';
    feedbackDiv.appendChild(confirmation);
  };
  
  const notHelpfulBtn = document.createElement('button');
  notHelpfulBtn.innerHTML = '<i class="fas fa-thumbs-down"></i> غير مفيد';
  notHelpfulBtn.title = 'هل كانت هذه الإجابة غير مفيدة؟';
  notHelpfulBtn.onclick = () => {
    learningSystem.learnFromInteraction(question, answer, 0);
    notHelpfulBtn.classList.add('rated');
    helpfulBtn.style.display = 'none';
    // إضافة رسالة تأكيد
    const confirmation = document.createElement('span');
    confirmation.textContent = 'شكراً على تقييمك! سنحاول تحسين إجاباتنا.';
    confirmation.style.marginLeft = '10px';
    confirmation.style.color = '#f44336';
    feedbackDiv.appendChild(confirmation);
  };
  
  feedbackDiv.appendChild(helpfulBtn);
  feedbackDiv.appendChild(notHelpfulBtn);
  messageElement.appendChild(feedbackDiv);
  
  // إضافة تأثير ظهور تدريجي
  setTimeout(() => {
    feedbackDiv.style.opacity = '1';
  }, 100);
}

// Handle send button click
function handleSend() {
  const userMessage = messageInput.value.trim();

  if (!userMessage) return;

  sendButton.disabled = true;
  messageInput.disabled = true;

  addMessage(userMessage, "user");
  conversationHistory.push({ sender: "user", text: userMessage });

  messageInput.value = "";

  if (suggestionsContainer) {
    suggestionsContainer.style.display = "none";
  }

  const lowerUserMessage = userMessage.toLowerCase();

  if (
    developerKeywords.some((keyword) =>
      lowerUserMessage.includes(keyword.toLowerCase())
    )
  ) {
    addMessage(developerInfoAnswer, "bot");
    sendButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  } else if (
    sourceKeywords.some((keyword) =>
      lowerUserMessage.includes(keyword.toLowerCase())
    )
  ) {
    addMessage(sourceInfoAnswer, "bot");
    sendButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  } else {
    // تحقق إذا كان السؤال مكرر أو مشابه لسؤال سابق
    const similarAnswer = findSimilarQuestion(userMessage);
    if (similarAnswer) {
      addMessage("(إجابة مختصرة لسؤالك السابق:)<br>" + similarAnswer, "bot");
      sendButton.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
      return;
    }
    sendMessageToAPI(userMessage);
  }
}

// Event listeners for send button and input
sendButton.addEventListener("click", handleSend);

messageInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter" && !messageInput.disabled) {
    handleSend();
  }
});

// Developer info modal functionality
const developerInfoBtn = document.getElementById("developer-info-btn");
const developerModal = document.getElementById("developer-modal");
const closeModalBtn = developerModal.querySelector(".close-modal-btn");

function openModal() {
  developerModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  developerModal.classList.remove("active");
  document.body.style.overflow = "auto";
}

developerInfoBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
developerModal.addEventListener("click", (event) => {
  if (event.target === developerModal) {
    closeModal();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && developerModal.classList.contains("active")) {
    closeModal();
  }
});

// Alerts button functionality
const alertsBtn = document.getElementById("alerts-btn");
alertsBtn.addEventListener("click", () => {
  const alertMessage = `
          <strong>تنبيهات:</strong><br>
          1. هذا البوت مخصص فقط للإجابة على الأسئلة المتعلقة بكلية التربية النوعية قسم تكنولوجيا التعليم.<br>
          2. يُرجى عدم استخدام البوت لأي أغراض غير أخلاقية أو خارجة عن النطاق المحدد.<br>
          3. المطورون غير مسؤولين عن أي استخدام غير صحيح أو غير أخلاقي للبوت.<br>
        `;

  const messageElement = document.createElement("div");
  messageElement.classList.add("message", "bot-message", "developer-message");
  messageElement.innerHTML = alertMessage;

  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Fetch and display latest news
async function fetchLatestNews() {
  const newsMessage = document.getElementById("news-message");
  const newsContent = document.getElementById("news-content");

  try {
    const news = [
      "تم الإعلان عن الجدول الدراسي للفصل الدراسي الأول.",
      "ورشة عمل حول تصميم الوسائط المتعددة يوم الخميس القادم.",
      "تم فتح باب التقديم لمشاريع التخرج.",
    ];

    newsContent.innerHTML = news.map((item) => `- ${item}`).join("<br>");
    newsMessage.style.display = "block";
  } catch (error) {
    console.error("Error fetching news:", error);
    newsContent.innerHTML = "عذراً، حدث خطأ أثناء تحميل الأخبار.";
    newsMessage.style.display = "block";
  }
}

fetchLatestNews();

// Dark mode toggle functionality
const darkModeToggle = document.getElementById("dark-mode-toggle");
const body = document.body;

darkModeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
});

// Language toggle functionality
const languageToggle = document.getElementById("language-toggle");
const welcomeMessageAr = document.getElementById("welcome-message-ar");
const welcomeMessageEn = document.getElementById("welcome-message-en");

languageToggle.addEventListener("click", () => {
  const isArabic = document.documentElement.lang === "ar";
  document.documentElement.lang = isArabic ? "en" : "ar";
  welcomeMessageAr.style.display = isArabic ? "none" : "block";
  welcomeMessageEn.style.display = isArabic ? "block" : "none";
  languageToggle.textContent = isArabic ? "AR" : "EN";
});

// ========== Speech-to-Text (Voice Input) ========== //
const voiceInputBtn = document.getElementById("voice-input-btn");
let recognition;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = document.documentElement.lang === "ar" ? "ar-EG" : "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = function () {
    voiceInputBtn.classList.add("active");
    voiceInputBtn.title = "جاري الاستماع... اضغط للإيقاف";
  };
  recognition.onend = function () {
    voiceInputBtn.classList.remove("active");
    voiceInputBtn.title = "تحدث";
  };
  recognition.onerror = function (event) {
    voiceInputBtn.classList.remove("active");
    voiceInputBtn.title = "تحدث";
    alert("حدث خطأ أثناء التعرف على الصوت: " + event.error);
  };
  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    messageInput.focus();
  };

  voiceInputBtn.addEventListener("click", function () {
    if (voiceInputBtn.classList.contains("active")) {
      recognition.stop();
    } else {
      recognition.lang = document.documentElement.lang === "ar" ? "ar-EG" : "en-US";
      recognition.start();
    }
  });
} else {
  voiceInputBtn.disabled = true;
  voiceInputBtn.title = "المتصفح لا يدعم التعرف على الصوت";
}

// ========== Text-to-Speech (Voice Output) ========== //
let currentSpeech = null;

function speakText(text, lang = "ar-EG") {
  if (!window.speechSynthesis) return;
  
  // إذا كان هناك قراءة جارية، قم بإيقافها
  if (currentSpeech) {
    window.speechSynthesis.cancel();
    currentSpeech = null;
    return;
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  currentSpeech = utterance;
  
  utterance.onend = () => {
    currentSpeech = null;
    // تحديث أيقونة الزر بعد انتهاء القراءة
    const speakButtons = document.querySelectorAll('.speak-btn');
    speakButtons.forEach(btn => {
      if (btn.innerHTML.includes('fa-stop')) {
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      }
    });
  };
  
  window.speechSynthesis.speak(utterance);
}

// دوال التحميل
function showLoading() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-indicator';
  loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(loadingDiv);
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading-indicator');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// دالة إرسال الرسالة
async function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const message = messageInput.value.trim();
  
  if (message === "") return;
  
  addMessage(message, "user");
  messageInput.value = "";
  
  try {
    showLoading();
    
    // إرسال السؤال العادي
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
      }),
    });
    
    if (!response.ok) {
      throw new Error("فشل في الاتصال بالخادم");
    }
    
    const data = await response.json();
    addMessage(data.response, "assistant");
    
  } catch (error) {
    console.error("خطأ:", error);
    addMessage("عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.", "assistant");
  } finally {
    hideLoading();
  }
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize DOM elements
  const chatMessages = document.getElementById("chat-messages");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const suggestionsContainer = document.getElementById("suggestions");
  const voiceInputBtn = document.getElementById("voice-input-btn");
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const languageToggle = document.getElementById("language-toggle");
  const developerInfoBtn = document.getElementById("developer-info-btn");
  const developerModal = document.getElementById("developer-modal");
  const closeModalBtn = developerModal?.querySelector(".close-modal-btn");
  const alertsBtn = document.getElementById("alerts-btn");

  // Add event listeners
  if (sendButton) {
    sendButton.addEventListener("click", handleSend);
  }

  if (messageInput) {
    messageInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter" && !messageInput.disabled) {
        handleSend();
      }
    });
  }

  // ... rest of the existing code ...
});

// ========== Language Preference in LocalStorage ========== //
function setLanguage(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('preferredLanguage', lang);
  updateUIText(lang);
}

function getLanguage() {
  return localStorage.getItem('preferredLanguage') || 'ar';
}

function updateUIText(lang) {
  // Example: update button and modal texts
  document.getElementById('language-toggle').textContent = lang === 'ar' ? 'EN' : 'AR';
  document.getElementById('send-button').title = lang === 'ar' ? 'إرسال' : 'Send';
  document.getElementById('send-button').ariaLabel = lang === 'ar' ? 'إرسال' : 'Send';
  document.getElementById('voice-input-btn').title = lang === 'ar' ? 'تحدث' : 'Speak';
  document.getElementById('voice-input-btn').ariaLabel = lang === 'ar' ? 'تحدث' : 'Speak';
  // ... add more UI elements as needed ...
  // Example for modals:
  const devModal = document.getElementById('developer-modal');
  if (devModal) {
    devModal.querySelector('h3').textContent = lang === 'ar' ? 'عن المطورين' : 'About Developers';
    // ... update other modal texts ...
  }
  // ... repeat for alerts modal, suggestions, etc.
}

// On page load, set language from LocalStorage
window.addEventListener('DOMContentLoaded', function() {
  setLanguage(getLanguage());
});

// Update language toggle event
languageToggle.addEventListener('click', () => {
  const currentLang = document.documentElement.lang;
  const newLang = currentLang === 'ar' ? 'en' : 'ar';
  setLanguage(newLang);
  // Also update welcome messages
  welcomeMessageAr.style.display = newLang === 'ar' ? 'block' : 'none';
  welcomeMessageEn.style.display = newLang === 'en' ? 'block' : 'none';
});

