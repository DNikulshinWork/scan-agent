import { Vacancy, DeveloperProfile, KeywordScoringRule } from '../types';

export const initialProfile: DeveloperProfile = {
  name: 'Никульшин Дмитрий Юрьевич',
  age: 41,
  location: 'Москва (готов работать удалённо)',
  phone: '+7 (926) 7189408',
  email: 'd.nikulshin.work@gmail.com',
  telegram: '@nikulshin_dev',
  github: 'https://github.com/DNikulshin',
  portfolioUrl: 'https://dnikulshin.github.io',
  maxProfile: 'https://max.ru/u/f9LHodD0cOKeahj66G3czogzq-x-QlHLLsLhyobxy4mXfIyaOmGnYMxYeLE',
  headline: 'Fullstack-разработчик (Node.js/React)',
  totalExperience: '3 года 3 месяца',
  stack: [
    'TypeScript',
    'React',
    'Next.js (Nextjs 15)',
    'Node.js',
    'NestJS',
    'Fastify',
    'Python',
    'FastAPI',
    'PostgreSQL',
    'Prisma',
    'Redis',
    'Docker',
    'WebSocket',
    'GitHub Actions (CI/CD)',
    'React Native (Expo)',
    'TanStack Query',
    'Redux Toolkit',
    'pgvector',
    'RAG',
    'LangChain (JS/TS)',
    'Playwright',
    'Puppeteer',
    'Pytest',
    'Vitest',
    'Caddy',
  ],
  projects: [
    {
      title: 'Система мониторинга корпоративного транспорта',
      category: 'Fullstack',
      githubRepo: 'corporate-transport',
      stack: ['React PWA', 'WebSocket', 'IndexedDB', 'React Native (Expo)', 'Docker', 'GitHub Actions', 'VPS'],
      description:
        'Монорепозиторий для realtime-трекинга автопарка с одновременной обработкой WebSocket-соединений от десятков устройств. Админ-панель — React PWA с офлайн-очередью на IndexedDB, мобильное приложение для водителей на React Native (Expo).',
    },
    {
      title: 'CRM-системы поддержки и продаж (Helpdesk)',
      category: 'Fullstack',
      githubRepo: 'support-ticketing-system, task-management-crm',
      stack: ['NestJS', 'Next.js 15 (App Router)', 'TypeScript', 'Prisma', 'PostgreSQL', 'TanStack Query', 'Server Actions'],
      description:
        'Бэкенд хелпдеска с ролевой моделью доступа (admin/agent/user), комментариями, вложениями, Swagger-документацией. Server Actions и оптимистичные обновления UI на Next.js 15.',
    },
    {
      title: 'AI-агент для мониторинга фриланс-бирж и вакансий',
      category: 'AI / Automation',
      githubRepo: 'scan-agent',
      stack: ['TypeScript', 'Playwright', 'Telegram Bot API', 'PostgreSQL', 'Next.js PWA'],
      description:
        'TypeScript-агент: парсинг заказов с бирж (Playwright), детерминированная фильтрация и оценка релевантности, генерация персонализированных откликов, уведомления в Telegram, синхронизация с облаком и дашборд.',
    },
    {
      title: 'DocBrain — RAG-система для корпоративных документов',
      category: 'AI / Automation',
      githubRepo: 'docbrain',
      stack: ['Python', 'FastAPI', 'LangChain', 'pgvector (PostgreSQL)', 'MinIO', 'Authelia', 'n8n'],
      description:
        'Пайплайн парсинга и адаптивного чанкинга, векторное хранилище pgvector, гибридный поиск с цитированием источников, веб-чат и Telegram-бот, агент с function calling.',
    },
    {
      title: 'AI Automation Starter',
      category: 'AI / Automation',
      githubRepo: 'ai-automation-starter',
      stack: ['Python', 'FastAPI', 'LLM pipeline', 'Markdown/Obsidian', 'pytest', 'Docker'],
      description:
        'Модульный Python-проект автоматизации бизнес-процессов. Пайплайн обработки данных, структурированный вывод в Markdown, pytest-тесты.',
    },
    {
      title: 'Инфраструктурные решения (AnyWhereDesk, pc-remote)',
      category: 'Infra',
      githubRepo: 'AnyWhereDesk',
      stack: ['Apache Guacamole', '2FA', "Let's Encrypt / Caddy", 'Cloudflare DDNS', 'Node.js', 'Vitest'],
      description:
        'Self-hosted браузерный доступ к рабочим столам через Apache Guacamole: 2FA, автовыпуск SSL, идемпотентный 6-этапный установщик, агент мониторинга ПК на Node.js.',
    },
    {
      title: 'ООО "Связь Стандарт" (Helpdesk PWA)',
      category: 'Fullstack',
      stack: ['React (Hooks, Redux Toolkit)', 'Node.js (Express)', 'PostgreSQL', 'WebSocket', 'Яндекс.Карты'],
      description:
        'Разработка PWA-приложения с нуля для внутренних нужд компании. Интеграция Яндекс.Карт для отображения заявок, система уведомлений и ролевая модель доступа. Сократил время обработки заявок на 30%.',
    },
  ],
  strengths: [
    'Единолично закрываю полный цикл: архитектура → бэкенд → фронтенд → инфраструктура → деплой',
    'Строгий TypeScript на бэкенде (NestJS, Fastify, Node.js) и фронтенде (Next.js 15 App Router, React 19)',
    'Реляционные СУБД: PostgreSQL (Neon, Supabase), Prisma ORM, транзакции, оптимизация индексов',
    'Опыт разработки мобильных клиентов на React Native (Expo) и PWA с офлайн-синхронизацией',
    'Архитектурный паттерн организации монорепозитория микросервисов (ED Microservices Monorepo Pattern)',
  ],
  typicalTimeline: '1–3 дня для модулей/интеграций, 1–2 недели для автономного микросервиса',
  communicationStyle: 'Конкретно и по делу, без воды. Сразу к сути задачи.',
  hhResumeRawText: `Никульшин Дмитрий Юрьевич
Мужчина, 41 год, родился 26 февраля 1985
+7 (926) 7189408 | d.nikulshin.work@gmail.com
telegram: @nikulshin_dev | GitHub: https://github.com/DNikulshin | Портфолио: https://dnikulshin.github.io
Проживает: Москва. Гражданство: Россия. Готов работать удалённо.

Желаемая должность: Fullstack-разработчик (Node.js/React)
Специализации: Программист, разработчик
Формат работы: удалённо

Опыт работы: 3 года 3 месяца
- Декабрь 2024 — настоящее время: Независимая разработка (фриланс / собственные продакшн-проекты)
  Проектирование архитектуры, fullstack-разработка на TypeScript (Node.js/NestJS, React, Next.js), Python (FastAPI), контейнеризация (Docker) и настройка CI/CD.
  Проекты: corporate-transport (Realtime, WebSockets, React PWA, Expo), support-ticketing-system (NestJS, Next.js 15, Prisma, PostgreSQL, TanStack Query), scan-agent, DocBrain (Python, FastAPI, pgvector, LangChain), AnyWhereDesk.
- Июль 2023 — Декабрь 2024 (1 год 6 мес): ООО "Связь Стандарт", Fullstack-разработчик (React / Node.js / Express)
  Разработка PWA Helpdesk с нуля: React (Hooks, Redux Toolkit), Node.js (Express), PostgreSQL, WebSocket, Яндекс.Карты.

Образование: Высшее, МГТУ "МАМИ", Москва (Информатика, Прикладная информатика)
Курсы: Frontend-разработчик, Result School, 2021
Навыки: TypeScript, React, Node.js, Nextjs, PostgreSQL, Docker, GitHub Actions, Redis, Prisma, WebSocket, CI/CD, Python, FastAPI, NestJS, LangChain, RAG, pgvector, Telegram Bot API, n8n, Puppeteer, Playwright, Pytest`,
};

export const defaultScoringRules: KeywordScoringRule = {
  core: [
    'typescript',
    'react',
    'next.js',
    'nextjs',
    'node.js',
    'nodejs',
    'nestjs',
    'fastify',
    'fullstack',
    'full-stack',
    'full stack',
    'python',
    'fastapi',
    'postgresql',
    'postgres',
    'prisma',
  ],
  related: [
    'docker',
    'redis',
    'websocket',
    'tanstack',
    'react query',
    'react native',
    'expo',
    'ci/cd',
    'github actions',
    'pwa',
    'redux',
    'pgvector',
    'rag',
    'langchain',
    'playwright',
    'puppeteer',
    'app router',
    'server actions',
  ],
  nice: [
    'tailwind',
    'zustand',
    'caddy',
    'nginx',
    'swagger',
    'vitest',
    'pytest',
    'zod',
    'n8n',
    'rest api',
  ],
  hardExclude: [
    '1с',
    '1c',
    'битрикс',
    'bitrix',
    'wordpress',
    'tilda',
    'joomla',
    'drupal',
    'php',
    'java ',
    'c#',
    '.net',
    'dotnet',
    'delphi',
    'pascal',
    'abap',
    'sap',
    'сметчик',
    'геодезист',
    'прораб',
    'химик',
    'qa',
    'тестировщик',
    'unity',
    'unreal',
    'gamedev',
  ],
  minScore: 7,
  minSalaryFilter: 150000,
};

export const initialVacancies: Vacancy[] = [
  {
    id: 'hh-110293841',
    orderId: '110293841',
    source: 'hh',
    title: 'Senior / Middle+ Fullstack Developer (Next.js 15, Node.js / NestJS, TypeScript)',
    description:
      'Ищем Fullstack-разработчика в продуктовую команду. Стек: Next.js 15 (App Router), TypeScript, Node.js (NestJS / Fastify), PostgreSQL, Prisma, Redis, Docker. Задачи: развитие веб-платформы, оптимизация производительности, построение надежного API.',
    price: '280 000 – 350 000 ₽',
    salaryNum: 280000,
    link: 'https://hh.ru/vacancy/110293841',
    employer: 'FinTech Cloud Solutions',
    city: 'Москва',
    isRemote: true,
    score: 10,
    keywordScore: 45,
    matchPercentage: 100,
    matchedKeywords: ['Next.js', 'Node.js', 'NestJS', 'TypeScript', 'PostgreSQL', 'Prisma', 'Redis', 'Docker'],
    missingKeywords: [],
    filterVerdict: 'Идеальное попадание в стек резюме: Next.js 15 App Router, NestJS, TypeScript, PostgreSQL, Prisma, Redis, Docker. Без стоп-слов.',
    hook: 'Разрабатывал аналогичный стек: Next.js 15 (App Router) + NestJS + Prisma + PostgreSQL в коммерческих проектах CRM и мониторинга.',
    pitch: `Здравствуйте! Заинтересовала ваша вакансия.

Мой основной профиль — Fullstack-разработка на TypeScript (Node.js/NestJS + React/Next.js 15).
В подтверждение релевантного опыта:
• Спроектировал и реализовал Helpdesk CRM (support-ticketing-system): NestJS, Next.js 15 (App Router), Prisma, PostgreSQL, TanStack Query, Server Actions и оптимистичные обновления интерфейса.
• Создал realtime-систему мониторинга транспорта (corporate-transport) с WebSocket и Docker CI/CD через GitHub Actions.
• Пишу строгий типизированный код, проектирую чистые реляционные схемы данных и соблюдаю архитектурные паттерны монорепозиториев.

Готов оперативно обсудить проектные задачи. Резюме и открытый код доступны на https://github.com/DNikulshin.`,
    tags: ['Next.js', 'Node.js', 'NestJS', 'TypeScript', 'PostgreSQL', 'Prisma', 'Redis', 'Docker'],
    status: 'new',
    outcome: 'pending',
    publishedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    processedAt: new Date(Date.now() - 3600000 * 2.4).toISOString(),
    experienceRequirement: '3–6 лет',
    schedule: 'Удаленная работа',
  },
  {
    id: 'hh-110827361',
    orderId: '110827361',
    source: 'hh',
    title: 'Node.js / Python Backend Developer (Fastify, FastAPI, PostgreSQL, Docker)',
    description:
      'Команда бэкенд-разработки ищет инженера. Стек: Node.js (Fastify) или Python (FastAPI), PostgreSQL, Prisma, Redis, Docker. Задачи: микросервисная архитектура, обработка очередей, интеграция со сторонними сервисами и парсерами.',
    price: '250 000 – 310 000 ₽',
    salaryNum: 250000,
    link: 'https://hh.ru/vacancy/110827361',
    employer: 'Core Infrastructure Labs',
    city: 'Удаленно',
    isRemote: true,
    score: 9,
    keywordScore: 40,
    matchPercentage: 92,
    matchedKeywords: ['Node.js', 'Fastify', 'Python', 'FastAPI', 'PostgreSQL', 'Prisma', 'Docker', 'Redis'],
    missingKeywords: [],
    filterVerdict: 'Прямое совпадение по бэкенд-стеку: Fastify + Python FastAPI + PostgreSQL/Prisma + Docker.',
    hook: 'Пишу микросервисы на Fastify (Node.js) и FastAPI (Python), проектирую схемы в PostgreSQL и упаковываю в Docker.',
    pitch: `Добрый день! Вакансия точно ложится на мой практический стек.

В портфолио есть завершенные проекты на обоих языках:
1. Fastify API для системы трекинга (corporate-transport) с параллельной обработкой десятков WebSocket-соединений.
2. Python / FastAPI сервис DocBrain с интеграцией pgvector (PostgreSQL) и фоновыми пайплайнами.
3. Опыт написания парсеров данных (Playwright, Puppeteer) и микросервисов в Docker с CI/CD в GitHub Actions.

С удовольствием подключусь к решению задач по микросервисам и базам данных. Мой GitHub: https://github.com/DNikulshin`,
    tags: ['Node.js', 'Fastify', 'Python', 'FastAPI', 'PostgreSQL', 'Prisma', 'Docker'],
    status: 'new',
    outcome: 'pending',
    publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    processedAt: new Date(Date.now() - 3600000 * 5.8).toISOString(),
    experienceRequirement: '3–6 лет',
    schedule: 'Удаленная работа',
  },
  {
    id: 'hh-110482910',
    orderId: '110482910',
    source: 'hh',
    title: 'Frontend / Fullstack разработчик (React, Next.js, TypeScript, TanStack Query)',
    description:
      'Разработка SPA/PWA аналитической панели управления. Требуется React, TypeScript, Next.js, TanStack Query, Tailwind CSS, умение работать с WebSocket и сложными формами.',
    price: '220 000 – 270 000 ₽',
    salaryNum: 220000,
    link: 'https://hh.ru/vacancy/110482910',
    employer: 'DataViz Pro',
    city: 'Санкт-Петербург',
    isRemote: true,
    score: 9,
    keywordScore: 35,
    matchPercentage: 88,
    matchedKeywords: ['React', 'Next.js', 'TypeScript', 'TanStack Query', 'Tailwind', 'WebSocket', 'PWA'],
    missingKeywords: [],
    filterVerdict: 'Совпадение по фронтенд-фильтрам: React + Next.js + TypeScript + TanStack Query + WebSocket + PWA.',
    hook: 'Разрабатывал PWA с офлайн-режимом и WebSocket-трекингом на стеке React + TypeScript + TanStack Query.',
    pitch: `Приветствую! 

Специализируюсь на создании сложных и быстрых веб-приложений на React и Next.js.
Имею коммерческий опыт:
• Разработка PWA панелей с автосинхронизацией (React Hooks, TanStack Query, IndexedDB).
• Построение realtime UI с WebSocket для отображения телеметрии транспорта и заявок техподдержки.
• Верстка на Tailwind CSS, компонентная декомпозиция, строгая типизация TypeScript.

Буду рад пообщаться и выполнить тестовое задание. Портфолио: https://dnikulshin.github.io`,
    tags: ['React', 'Next.js', 'TypeScript', 'TanStack Query', 'Tailwind', 'WebSocket'],
    status: 'applied',
    outcome: 'pending',
    publishedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    processedAt: new Date(Date.now() - 3600000 * 13.5).toISOString(),
    appliedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    experienceRequirement: '1–3 года',
    schedule: 'Удаленная работа',
  },
  {
    id: 'hh-110992812',
    orderId: '110992812',
    source: 'hh',
    title: 'Fullstack разработчик (React Native / Expo + Node.js / TypeScript)',
    description:
      'Ищем инженера для поддержки мобильного приложения на React Native (Expo) и синхронизированного бэкенда на Node.js (TypeScript, PostgreSQL).',
    price: '230 000 – 280 000 ₽',
    salaryNum: 230000,
    link: 'https://hh.ru/vacancy/110992812',
    employer: 'Fleet Transport Tech',
    city: 'Москва',
    isRemote: true,
    score: 9,
    keywordScore: 38,
    matchPercentage: 90,
    matchedKeywords: ['React Native', 'Expo', 'Node.js', 'TypeScript', 'PostgreSQL'],
    missingKeywords: [],
    filterVerdict: 'Редкое и точное совпадение: связка React Native (Expo) + Node.js бэкенд, прямое попадание в проект corporate-transport.',
    hook: 'Запустил в продакшн мобильное приложение для водителей на React Native (Expo) в связке с Node.js бэкендом.',
    pitch: `Здравствуйте! У меня есть готовый опыт решения именно такой задачи:

В проекте «Система мониторинга корпоративного транспорта» (GitHub: corporate-transport) я разработал:
1. Мобильное приложение для водителей на React Native (Expo) со сбором геопозиции.
2. Бэкенд на Node.js и PostgreSQL для приема телеметрии и раздачи через WebSocket.
3. Веб-панель диспетчера на React.

Готов поделиться деталями архитектуры и подключиться к развитию вашего продукта.`,
    tags: ['React Native', 'Expo', 'Node.js', 'TypeScript', 'PostgreSQL'],
    status: 'applied',
    outcome: 'won',
    publishedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    processedAt: new Date(Date.now() - 3600000 * 27.5).toISOString(),
    appliedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    experienceRequirement: '3–6 лет',
    schedule: 'Удаленная работа',
  },
  {
    id: 'hh-110554321',
    orderId: '110554321',
    source: 'hh',
    title: 'Программист 1С:Предприятие 8.3 / ERP консультант',
    description: 'Сопровождение конфигурации 1С:ERP, доработка типовых механизмов, настройка обменов через КД 2.0/3.0.',
    price: '190 000 ₽',
    salaryNum: 190000,
    link: 'https://hh.ru/vacancy/110554321',
    employer: 'Торговый Дом Союз',
    city: 'Екатеринбург',
    isRemote: false,
    score: 0,
    keywordScore: -999,
    matchPercentage: 0,
    matchedKeywords: [],
    missingKeywords: ['TypeScript', 'Node.js', 'React'],
    filterVerdict: 'Отсеяно стоп-фильтром hardExclude: обнаружено стоп-слово "1с". Вакансия не передается на скоринг.',
    hook: '',
    pitch: '',
    tags: ['1C', 'ERP'],
    status: 'skipped',
    outcome: 'lost',
    publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    processedAt: new Date(Date.now() - 3600000 * 47).toISOString(),
    experienceRequirement: '3–6 лет',
    schedule: 'Полный день',
  },
  {
    id: 'hh-110776543',
    orderId: '110776543',
    source: 'hh',
    title: 'Junior QA Engineer / Тестировщик ПО',
    description: 'Ручное тестирование веб-интерфейсов, оформление баг-репортов в Jira, базовые SQL-запросы.',
    price: '65 000 ₽',
    salaryNum: 65000,
    link: 'https://hh.ru/vacancy/110776543',
    employer: 'Digital Agency Start',
    city: 'Казань',
    isRemote: true,
    score: 0,
    keywordScore: -999,
    matchPercentage: 0,
    matchedKeywords: [],
    missingKeywords: ['TypeScript', 'React', 'Node.js'],
    filterVerdict: 'Отсеяно стоп-фильтром hardExclude: позиция "тестировщик / QA", не относится к разработке.',
    hook: '',
    pitch: '',
    tags: ['QA'],
    status: 'skipped',
    outcome: 'lost',
    publishedAt: new Date(Date.now() - 3600000 * 52).toISOString(),
    processedAt: new Date(Date.now() - 3600000 * 51).toISOString(),
    experienceRequirement: 'Без опыта',
    schedule: 'Удаленная работа',
  },
];
