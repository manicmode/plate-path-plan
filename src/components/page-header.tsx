
import React from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
};

export const PageHeader = ({ title, description }: PageHeaderProps) => (
  <div className="mb-6">
    <h1 className="text-3xl font-bold text-foreground">{title}</h1>
    {description && (
      <p className="text-muted-foreground mt-2">{description}</p>
    )}
  </div>
);
