export function generateCoverLetter(title: string, tags: string[]): { hook: string; pitch: string } {
  const tLower = title.toLowerCase();
  const allText = `${tLower} ${tags.join(' ')}`.toLowerCase();

  let hook = 'Fullstack разработчик (Next.js 15, TypeScript, Node.js / NestJS / Fastify, PostgreSQL).';
  let projectHighlight =
    'В моем портфолио реализованы распределенные сервисы на Fastify/Node.js, PWA с WebSocket-трекингом и микросервисы на NestJS.';

  if (allText.includes('nest') || allText.includes('crm') || allText.includes('ticket')) {
    hook = 'Имею подтвержденный опыт проектирования CRM/Helpdesk систем на NestJS и Next.js 15 App Router.';
    projectHighlight =
      'Реализовал проект support-ticketing-system: модульная архитектура на NestJS, Prisma ORM, PostgreSQL и Next.js 15.';
  } else if (allText.includes('fastify') || allText.includes('транспорт') || allText.includes('гео')) {
    hook = 'Специализируюсь на сервисах реального времени на базе Fastify, WebSocket и PostgreSQL.';
    projectHighlight =
      'Разработал систему корпоративного транспорта: высоконагруженный бэкенд на Fastify, WebSocket-шлюзы для GPS-трекинга.';
  } else if (allText.includes('python') || allText.includes('fastapi')) {
    hook = 'Уверенно владею связкой TypeScript Fullstack + Python (FastAPI, pgvector).';
    projectHighlight =
      'Разработал RAG-систему DocBrain: микросервисы на FastAPI, векторный поиск в PostgreSQL (pgvector).';
  }

  const pitch = `Здравствуйте! Меня заинтересовала вакансия «${title}».

${hook}
${projectHighlight}

Контакты:
• Telegram: @nikulshin_dev
• Телефон: +7 (926) 718-94-08
• GitHub: https://github.com/DNikulshin
• Портфолио: https://dnikulshin.github.io

Буду рад обсудить детали задач на онлайн-интервью.`;

  return { hook, pitch };
}
