export interface SkillPack {
  key: string;
  name: string;
  icon: string;
  description: string;
  skills: string[];
  goalMatch: string[];
}

export const skillPacks: SkillPack[] = [
  {
    key: "content-creator",
    name: "Content Creator",
    icon: "Pen",
    description: "Write, script, and publish across every medium",
    skills: ["BlogWriter", "ScriptForge", "HookFactory", "ContentMachine"],
    goalMatch: ["create-content"],
  },
  {
    key: "developer",
    name: "Developer",
    icon: "Code",
    description: "Ship code faster with AI-assisted development",
    skills: ["CodeProject", "CreateCLI", "DesignEngineer", "CriticAgent"],
    goalMatch: ["build-software"],
  },
  {
    key: "business-owner",
    name: "Business Owner",
    icon: "Briefcase",
    description: "Automate operations and accelerate growth",
    skills: ["BusinessOS", "MarketResearch", "FinancialModeling", "LaunchPipeline"],
    goalMatch: ["run-business"],
  },
  {
    key: "productivity",
    name: "Productivity",
    icon: "Zap",
    description: "Organize your thinking and get things done",
    skills: ["BrainDump", "DoWork", "Reflect", "Telos"],
    goalMatch: ["personal-productivity"],
  },
  {
    key: "researcher",
    name: "Researcher",
    icon: "Search",
    description: "Deep dives, analysis, and knowledge synthesis",
    skills: ["Research", "FirstPrinciples", "OSINT", "Fabric"],
    goalMatch: ["learn-research"],
  },
  {
    key: "creative",
    name: "Creative",
    icon: "Palette",
    description: "Art, worldbuilding, and creative exploration",
    skills: ["Art", "WorldBuilder", "ImageGen", "BeCreative"],
    goalMatch: ["creative-projects"],
  },
];

export function getMatchingPacks(goals: string[]): string[] {
  return skillPacks
    .filter((pack) => pack.goalMatch.some((g) => goals.includes(g)))
    .map((pack) => pack.key);
}
