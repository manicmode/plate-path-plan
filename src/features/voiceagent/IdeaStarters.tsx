import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { IDEA_STARTERS } from "./ideaStarters";
import { cn } from "@/lib/utils";

interface IdeaStartersProps {
  onQuestionSelect: (question: string) => void;
  disabled?: boolean;
}

export default function IdeaStarters({ onQuestionSelect, disabled = false }: IdeaStartersProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleCategory = (categoryKey: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const handleQuestionClick = (question: string) => {
    if (!disabled) {
      onQuestionSelect(question);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Idea Starters</h2>
        <p className="text-sm text-muted-foreground">
          Tap any question — I'll speak the answer.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {IDEA_STARTERS.map((starter) => (
          <div key={starter.section} className="border rounded-xl overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(starter.section)}
              disabled={disabled}
              className={cn(
                "w-full px-4 py-3 flex items-center justify-between",
                "bg-card hover:bg-accent/50 transition-colors",
                "font-medium text-left",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>{starter.section}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  openSections.includes(starter.section) && "rotate-180"
                )}
              />
            </button>

            {/* Section Content */}
            {openSections.includes(starter.section) && (
              <div className="border-t bg-accent/20">
                <div className="p-4 space-y-4">
                  {starter.categories.map((category) => {
                    const categoryKey = `${starter.section}-${category.title}`;
                    return (
                      <div key={categoryKey} className="border border-border/50 rounded-lg overflow-hidden">
                        {/* Category Header */}
                        <button
                          onClick={() => toggleCategory(categoryKey)}
                          disabled={disabled}
                          className={cn(
                            "w-full px-3 py-2 flex items-center justify-between",
                            "bg-background hover:bg-accent/30 transition-colors",
                            "text-sm font-medium text-left",
                            disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div>
                            <div>{category.title}</div>
                            {category.subtitle && (
                              <div className="text-xs text-muted-foreground font-normal">
                                {category.subtitle}
                              </div>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform duration-200",
                              openCategories.includes(categoryKey) && "rotate-180"
                            )}
                          />
                        </button>

                        {/* Category Questions */}
                        {openCategories.includes(categoryKey) && (
                          <div className="border-t border-border/30 bg-accent/10 p-3">
                            <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2">
                              {category.questions.map((question, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleQuestionClick(question)}
                                  disabled={disabled}
                                  className={cn(
                                    "p-2 rounded-lg text-xs text-left",
                                    "bg-gradient-to-r from-accent to-accent/80",
                                    "border border-border/20",
                                    "shadow-[0_4px_12px_rgba(0,0,0,0.04)]",
                                    "hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)]",
                                    "hover:brightness-105 hover:scale-[1.02]",
                                    "active:scale-[0.98] transition-all duration-200",
                                    "select-none",
                                    disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:brightness-100"
                                  )}
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}