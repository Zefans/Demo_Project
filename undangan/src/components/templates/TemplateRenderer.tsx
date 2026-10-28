import React from 'react';
import type { InvitationData, TemplateId } from '../../types/invitation';
import PlayfulGardenTemplate from './PlayfulGardenTemplate';
import RetroLoveTemplate from './RetroLoveTemplate';
import ModernEditorialTemplate from './ModernEditorialTemplate';

interface Props {
  data: InvitationData;
  guestName?: string;
  isPreview?: boolean;
}

export default function TemplateRenderer({ data, guestName, isPreview = false }: Props) {
  const map: Record<TemplateId, React.ComponentType<Props>> = {
    'playful-garden': PlayfulGardenTemplate,
    'retro-love': RetroLoveTemplate,
    'modern-editorial': ModernEditorialTemplate,
  };

  const Component = map[data.templateId] ?? PlayfulGardenTemplate;
  return <Component data={data} guestName={guestName} isPreview={isPreview} />;
}

