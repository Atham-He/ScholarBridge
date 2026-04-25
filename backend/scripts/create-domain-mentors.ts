import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 八个领域的导师数据
interface DomainMentorData {
  domainSlug: string;
  domainName: string;
  mentors: Array<{
    name: string;
    institution: string;
    department: string;
    title: string;
    bioShort: string;
    location: string;
    researchInterests: string[];
    labName: string;
    researchTopics: string[];
  }>;
}

const domainsData: DomainMentorData[] = [
  {
    domainSlug: "logical-mathematical",
    domainName: "逻辑数理智能",
    mentors: [
      {
        name: "Dr. Catherine Zhang",
        institution: "MIT · Mathematics",
        department: "Department of Mathematics",
        title: "Professor",
        bioShort: "Leading research in formal verification and automated theorem proving for deep learning systems.",
        location: "Cambridge, MA",
        researchInterests: ["Formal Methods", "Automated Theorem Proving", "Type Theory", "Program Verification"],
        labName: "Formal AI Lab",
        researchTopics: ["Formal Verification of Neural Networks", "Coq Proof Assistant", "Homotopy Type Theory"],
      },
      {
        name: "Dr. Robert Chen",
        institution: "Stanford University",
        department: "Computer Science Department",
        title: "Associate Professor",
        bioShort: "Working on mathematical foundations of machine learning and optimization theory.",
        location: "Stanford, CA",
        researchInterests: ["Optimization Theory", "Mathematical ML", "Computational Learning Theory", "Convex Optimization"],
        labName: "Optimization & Learning Group",
        researchTopics: ["Non-convex Optimization", "Learning Theory", "Statistical Mechanics"],
      },
      {
        name: "Dr. Maria Santos",
        institution: "UC Berkeley",
        department: "EECS Department",
        title: "Assistant Professor",
        bioShort: "Researching algebraic topology applications in data analysis and machine learning.",
        location: "Berkeley, CA",
        researchInterests: ["Topological Data Analysis", "Algebraic Topology", "Manifold Learning", "Geometric Deep Learning"],
        labName: "Topology in ML Lab",
        researchTopics: ["Persistent Homology", "Simplicial Complexes", "Topological Regularization"],
      },
    ],
  },
  {
    domainSlug: "linguistic-verbal",
    domainName: "语言文字智能",
    mentors: [
      {
        name: "Dr. Sarah Kim",
        institution: "CMU · Language Technologies Institute",
        department: "Language Technologies Institute",
        title: "Professor",
        bioShort: "Pioneer in large language models and multilingual NLP with focus on low-resource languages.",
        location: "Pittsburgh, PA",
        researchInterests: ["Large Language Models", "Multilingual NLP", "Machine Translation", "Cross-lingual Transfer"],
        labName: "Multilingual NLP Lab",
        researchTopics: ["Low-resource NLP", "Universal Translation", "Language Model Efficiency"],
      },
      {
        name: "Dr. James Wilson",
        institution: "University of Washington",
        department: "Paul G. Allen School of Computer Science",
        title: "Associate Professor",
        bioShort: "Working on dialogue systems, conversational AI, and natural language understanding.",
        location: "Seattle, WA",
        researchInterests: ["Dialogue Systems", "Conversational AI", "Semantic Parsing", "Question Answering"],
        labName: "Conversational AI Group",
        researchTopics: ["Task-oriented Dialogue", "Semantic Parsing", "Knowledge-grounded Generation"],
      },
      {
        name: "Dr. Li Wei",
        institution: "Stanford University",
        department: "Computer Science Department",
        title: "Professor",
        bioShort: "Leading research in computational linguistics and structured language understanding.",
        location: "Stanford, CA",
        researchInterests: ["Computational Linguistics", "Parsing", "Semantic Representation", "Language Models"],
        labName: "Stanford NLP Group",
        researchTopics: ["Dependency Parsing", "Semantic Role Labeling", "Prompt Engineering"],
      },
    ],
  },
  {
    domainSlug: "visual-spatial",
    domainName: "视觉空间智能",
    mentors: [
      {
        name: "Dr. Emily Rodriguez",
        institution: "MIT · CSAIL",
        department: "Computer Science and Artificial Intelligence Laboratory",
        title: "Professor",
        bioShort: "Director of the Computer Vision Lab, working on 3D reconstruction and neural rendering.",
        location: "Cambridge, MA",
        researchInterests: ["3D Vision", "Neural Rendering", "Computational Photography", "Image Synthesis"],
        labName: "Vision & Graphics Lab",
        researchTopics: ["NeRF", "3D Reconstruction", "Generative Vision Models", "Diffusion Models"],
      },
      {
        name: "Dr. David Park",
        institution: "UC Berkeley",
        department: "EECS Department",
        title: "Associate Professor",
        bioShort: "Researching video understanding, action recognition, and embodied vision for robotics.",
        location: "Berkeley, CA",
        researchInterests: ["Video Understanding", "Action Recognition", "Embodied AI", "Vision-Language Models"],
        labName: "Video & Embodied Vision Lab",
        researchTopics: ["Temporal Reasoning", "Video Transformers", "Vision-Language Pretraining"],
      },
      {
        name: "Dr. Anna Mueller",
        institution: "Max Planck Institute for Informatics",
        department: "Computer Vision Department",
        title: "Director",
        bioShort: "Leading research in medical image analysis and interpretable computer vision.",
        location: "Saarbrücken, Germany",
        researchInterests: ["Medical Imaging", "Explainable AI", "Segmentation", "Visual Reasoning"],
        labName: "Medical Vision Group",
        researchTopics: ["MRI Analysis", "Explainable Computer Vision", "Attention Mechanisms"],
      },
    ],
  },
  {
    domainSlug: "bodily-kinesthetic",
    domainName: "身体动觉智能",
    mentors: [
      {
        name: "Dr. Michael Brown",
        institution: "CMU · Robotics Institute",
        department: "Robotics Institute",
        title: "Professor",
        bioShort: "Director of the Robotics Lab, focusing on legged locomotion and dynamic manipulation.",
        location: "Pittsburgh, PA",
        researchInterests: ["Legged Robotics", "Manipulation", "Control Theory", "Simulation-to-Reality"],
        labName: "Robotic Locomotion Lab",
        researchTopics: ["Quadruped Control", "Dexterous Manipulation", "Model Predictive Control"],
      },
      {
        name: "Dr. Yuki Tanaka",
        institution: "University of Tokyo",
        department: "Department of Creative Informatics",
        title: "Professor",
        bioShort: "Working on humanoid robots and human-robot interaction using deep reinforcement learning.",
        location: "Tokyo, Japan",
        researchInterests: ["Humanoid Robotics", "Human-Robot Interaction", "Imitation Learning", "RL from Human Feedback"],
        labName: "Human-Robot Interaction Lab",
        researchTopics: ["Whole-body Control", "Imitation Learning", "Social Robotics"],
      },
      {
        name: "Dr. Jessica Garcia",
        institution: "UC Berkeley",
        department: "EECS Department",
        title: "Associate Professor",
        bioShort: "Researching autonomous driving and multi-robot coordination using reinforcement learning.",
        location: "Berkeley, CA",
        researchInterests: ["Autonomous Driving", "Multi-robot Systems", "Reinforcement Learning", "Motion Planning"],
        labName: "Autonomous Systems Lab",
        researchTopics: ["Self-driving Cars", "Multi-agent Coordination", "Safe RL"],
      },
    ],
  },
  {
    domainSlug: "musical-rhythmic",
    domainName: "音乐节奏智能",
    mentors: [
      {
        name: "Dr. Thomas Anderson",
        institution: "MIT · Media Lab",
        department: "Media Lab",
        title: "Professor",
        bioShort: "Pioneer in music information retrieval and generative music models.",
        location: "Cambridge, MA",
        researchInterests: ["Music Generation", "Audio Signal Processing", "Music Information Retrieval", "Generative Audio"],
        labName: "Music & Audio AI Lab",
        researchTopics: ["Symbolic Music Generation", "Neural Audio Synthesis", "Music Understanding"],
      },
      {
        name: "Dr. Lisa Chen",
        institution: "Stanford University",
        department: "Center for Computer Research in Music and Acoustics",
        title: "Associate Professor",
        bioShort: "Working on speech synthesis, voice conversion, and emotional speech processing.",
        location: "Stanford, CA",
        researchInterests: ["Speech Synthesis", "Voice Conversion", "Emotional Speech", "Text-to-Speech"],
        labName: "Speech & Audio AI Group",
        researchTopics: ["Neural TTS", "Voice Cloning", "Emotion Recognition", "Singing Voice Synthesis"],
      },
      {
        name: "Dr. Erik Johansson",
        institution: "Spotify Research",
        department: "AI Research Team",
        title: "Principal Scientist",
        bioShort: "Leading research in music recommendation and audio understanding at scale.",
        location: "Stockholm, Sweden",
        researchInterests: ["Music Recommendation", "Audio Understanding", "Representation Learning", "Self-supervised Audio"],
        labName: "Spotify AI Research",
        researchTopics: ["Audio Transformers", "Music Embeddings", "Contextual Recommendation"],
      },
    ],
  },
  {
    domainSlug: "interpersonal",
    domainName: "人际交往智能",
    mentors: [
      {
        name: "Dr. Rachel Green",
        institution: "Stanford University",
        department: "Computer Science Department",
        title: "Professor",
        bioShort: "Director of the Social AI Lab, researching multi-agent systems and social intelligence.",
        location: "Stanford, CA",
        researchInterests: ["Multi-agent Systems", "Social Intelligence", "Game Theory", "Cooperative AI"],
        labName: "Social AI Lab",
        researchTopics: ["Emergent Communication", "Social Dilemmas", "Cooperative RL", "Theory of Mind"],
      },
      {
        name: "Dr. Daniel Lee",
        institution: "University of Pennsylvania",
        department: "Department of Computer and Information Science",
        title: "Professor",
        bioShort: "Working on human-AI collaboration and interactive learning systems.",
        location: "Philadelphia, PA",
        researchInterests: ["Human-AI Collaboration", "Interactive Machine Learning", "Explainable AI", "AI Safety"],
        labName: "GRAphical & Intelligent Systems Lab",
        researchTopics: ["Interactive RL", "Explainable Agency", "AI Alignment", "Collaborative Decision Making"],
      },
      {
        name: "Dr. Sophie Martin",
        institution: "Oxford University",
        department: "Department of Computer Science",
        title: "Associate Professor",
        bioShort: "Researching negotiation agents, social norms, and ethical AI systems.",
        location: "Oxford, UK",
        researchInterests: ["Negotiation Agents", "Social Norms", "Ethical AI", "Value Alignment"],
        labName: "AI Ethics & Governance Lab",
        researchTopics: ["Automated Negotiation", "Norm Learning", "Fair ML", "AI Governance"],
      },
    ],
  },
  {
    domainSlug: "intrapersonal",
    domainName: "内省智能",
    mentors: [
      {
        name: "Dr. Kevin Patel",
        institution: "DeepMind",
        department: "Research Team",
        title: "Senior Research Scientist",
        bioShort: "Leading research on meta-learning and self-improving AI systems.",
        location: "London, UK",
        researchInterests: ["Meta-learning", "Self-supervised Learning", "AutoML", "Neural Architecture Search"],
        labName: "Meta-Learning & Adaptation Team",
        researchTopics: ["MAML", "Self-supervised Pretraining", "Learning to Learn", "Adaptive Agents"],
      },
      {
        name: "Dr. Amanda Foster",
        institution: "UC Berkeley",
        department: "EECS Department",
        title: "Professor",
        bioShort: "Director of the AI Research Lab, working on continual learning and memory systems.",
        location: "Berkeley, CA",
        researchInterests: ["Continual Learning", "Memory Systems", "Lifelong Learning", "Catastrophic Forgetting"],
        labName: "Continual Learning Lab",
        researchTopics: ["Experience Replay", "Dynamic Architectures", "Memory Networks", "Lifelong ML"],
      },
      {
        name: "Dr. Hiroshi Nakamura",
        institution: "University of Tokyo",
        department: "Department of Information and Communication Engineering",
        title: "Professor",
        bioShort: "Researching self-awareness, introspection, and metacognition in AI systems.",
        location: "Tokyo, Japan",
        researchInterests: ["Metacognition", "Self-awareness", "Introspection", "AI Consciousness"],
        labName: "Metacognition & Self-awareness Lab",
        researchTopics: ["Confidence Estimation", "Uncertainty Quantification", "Self-evaluation", "Meta-reasoning"],
      },
    ],
  },
  {
    domainSlug: "naturalist",
    domainName: "自然观察智能",
    mentors: [
      {
        name: "Dr. Maria Lopez",
        institution: "MIT · Chemistry",
        department: "Department of Chemistry",
        title: "Professor",
        bioShort: "Pioneer in AI for scientific discovery and molecular property prediction.",
        location: "Cambridge, MA",
        researchInterests: ["AI for Science", "Molecular Property Prediction", "Drug Discovery", "Quantum Chemistry"],
        labName: "AI for Molecular Science Lab",
        researchTopics: ["Graph Neural Networks", "Molecular Generation", "Protein Structure Prediction", "Chemical Space"],
      },
      {
        name: "Dr. James Wright",
        institution: "Stanford University",
        department: "Department of Applied Physics",
        title: "Associate Professor",
        bioShort: "Working on AI for materials discovery and computational materials science.",
        location: "Stanford, CA",
        researchInterests: ["Materials Discovery", "Computational Materials", "Crystal Structure Prediction", "Inverse Design"],
        labName: "Materials Intelligence Lab",
        researchTopics: ["Crystal GNNs", "Property Prediction", "Materials Generation", "High-throughput Screening"],
      },
      {
        name: "Dr. Priya Sharma",
        institution: "University of Washington",
        department: "Department of Biology",
        title: "Professor",
        bioShort: "Applying machine learning to genomics, protein design, and systems biology.",
        location: "Seattle, WA",
        researchInterests: ["Computational Biology", "Genomics", "Protein Design", "Systems Biology"],
        labName: "Computational Biology Group",
        researchTopics: ["Genome Analysis", "Protein Structure", "Single-cell Analysis", "Biological Networks"],
      },
    ],
  },
];

async function createMentorForDomain(domain: DomainMentorData, mentor: typeof domainsData[0]["mentors"][0]) {
  // Generate email from name
  const nameParts = mentor.name.split(" ");
  const lastName = nameParts[nameParts.length - 1].toLowerCase();
  const firstName = nameParts[0].toLowerCase();
  const email = `mentor.${domain.domainSlug}.${firstName}.${lastName}.${Date.now()}@test.scholarbridge.local`;
  const password = await bcrypt.hash("demo123", 10);

  // Create user and mentor profile
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: password,
      role: UserRole.MENTOR,
      emailVerified: true,
      mentorProfile: {
        create: {
          displayName: mentor.name,
          institution: mentor.institution,
          department: mentor.department,
          title: mentor.title,
          bioShort: mentor.bioShort,
          location: mentor.location,
        },
      },
    },
    include: { mentorProfile: true },
  });

  // Create skill
  const slug = `${domain.domainSlug}-${firstName}-${lastName}-${Date.now()}`;
  const skill = await prisma.skill.create({
    data: {
      ownerUserId: user.id,
      slug,
      title: `${mentor.labName} — ${mentor.researchInterests[0]}`,
      profileMarkdown: [
        `## ${mentor.labName}`,
        "",
        mentor.bioShort,
        "",
        "## Research Focus",
        ...mentor.researchTopics.map(t => `- ${t}`),
        "",
        "## What We Look For",
        "- Strong background in " + mentor.researchInterests[0],
        "- Passion for cutting-edge research",
        "- Collaborative mindset",
        "",
        "## Positions",
        "Q: What positions are available?",
        "A: We have openings for PhD students, postdocs, and research interns. Fully funded positions available.",
      ].join("\n"),
      status: "PUBLISHED",
      isPublic: true,
      publishedAt: new Date(),
      tags: mentor.researchInterests,
      hIndex: Math.floor(25 + Math.random() * 45),
      citationsDisplay: `${(4 + Math.random() * 8).toFixed(1)}K`,
      researchSummary: `Our lab focuses on ${mentor.researchInterests.join(", ")}. We are passionate about advancing the state of the art in ${domain.domainName} and mentoring the next generation of researchers.`,
      publications: [
        {
          title: `Advances in ${mentor.researchTopics[0]}`,
          detail: `NeurIPS 2024 · ${mentor.name}`,
        },
        {
          title: `${mentor.researchTopics[1] || "Novel Approaches"} for ${mentor.researchInterests[0]}`,
          detail: `ICML 2024 · ${nameParts[0]} et al.`,
        },
        {
          title: `Breaking Through in ${domain.domainName}`,
          detail: `ICLR 2023 · ${mentor.name} · ${Math.floor(100 + Math.random() * 400)} citations`,
        },
      ],
      agentActive: true,
      agentIntro: `AI agent for ${mentor.name}. I can answer questions about ${mentor.labName}'s research, open positions, and application process.`,
      scholarSyncedAt: new Date(),
    },
  });

  // Create exploration record
  await prisma.aIMentorExploration.create({
    data: {
      mentorUserId: user.id,
      domainSlug: domain.domainSlug,
      nodeSlugs: mentor.researchTopics.slice(0, 3),
      additionalTags: mentor.researchInterests.slice(2),
    },
  });

  // Create projects
  await prisma.skillProject.createMany({
    data: [
      {
        skillId: skill.id,
        title: `PhD — ${mentor.researchTopics[0] || "Research Position"}`,
        description: `Fully funded PhD position working on ${mentor.researchTopics[0] || "cutting-edge research"}. Competitive stipend and benefits.`,
        status: "OPEN",
        metaTags: ["Fall 2025", "Fully Funded"],
        sortOrder: 0,
      },
      {
        skillId: skill.id,
        title: `Postdoc — ${mentor.researchTopics[1] || mentor.researchTopics[0]}`,
        description: `Postdoctoral position to advance research in ${mentor.researchTopics[1] || mentor.researchTopics[0]}.`,
        status: "OPEN",
        metaTags: ["Immediate", "2 Years"],
        sortOrder: 1,
      },
      {
        skillId: skill.id,
        title: `Research Intern — ${mentor.labName}`,
        description: `Summer internship opportunity to work on ${mentor.researchInterests[0]}. Great learning experience.`,
        status: "OPEN",
        metaTags: ["Summer 2025", "Undergrad", "Paid"],
        sortOrder: 2,
      },
    ],
  });

  return { user, skill };
}

async function main() {
  console.log("🌱 开始为8个AI领域创建测试导师...\n");

  let totalMentors = 0;

  for (const domain of domainsData) {
    console.log(`📚 ${domain.domainName} (${domain.domainSlug})`);

    for (const mentorData of domain.mentors) {
      try {
        const { user, skill } = await createMentorForDomain(domain, mentorData);
        totalMentors++;
        console.log(`  ✅ ${mentorData.name} - ${mentorData.labName}`);
        console.log(`     📧 ${user.email} / demo123`);
        console.log(`     🔗 Skill: ${skill.slug}`);
      } catch (error) {
        console.error(`  ❌ 创建失败: ${mentorData.name}`, error);
      }
    }

    console.log("");
  }

  console.log(`\n✨ 完成! 共创建 ${totalMentors} 位导师，覆盖8个AI领域`);
  console.log("📝 所有导师的密码都是: demo123");
  console.log("🔍 这些导师现在可以在explore板块中按领域找到");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
