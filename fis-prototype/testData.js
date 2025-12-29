// Тестовые данные для прототипа системы управления страховыми продуктами
// Основано на примерах из FUNCTIONAL_REQUIREMENTS_DETAILED.md

const TEST_PRODUCTS = [
    {
        id: 1703770800000, // 28.12.2023 12:00
        status: 'draft',
        createdAt: '2024-12-15T10:00:00.000Z',
        updatedAt: '2024-12-20T14:30:00.000Z',
        approvals: {
            'Продуктолог': { approved: false, comment: '', date: null },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        statusHistory: [
            { status: 'draft', date: '2024-12-15T10:00:00.000Z', changedBy: 'Система' }
        ],
        data: {
            // Компонент "Параметры"
            priority: '1',
            launchDate: '2024-05-13',
            closureDate: '2029-12-31',
            marketingName: 'Стратегия на пять. Гарант',
            partner: 'ВТБ',
            newPartnerName: '',
            segment: 'Розница',
            agencyCode: '115870',
            productGroup: 'НСЖ',
            productCode: 'IBGVTBROZ',
            lkCardType: 'Базис Гарант',
            productSubtype: 'Накопительный',
            assetLinked: false,
            investmentStrategy: false,
            llob: '36102',

            // Компонент "Страховой взнос"
            currencies: ['RUB'],
            frequencies: ['Единовременно', 'Ежегодно'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: true,
            evaluationContract: false,
            specialOffer: false,

            // Динамические таблицы - минимальная премия
            minPremiums: [
                { currency: 'RUB', frequency: 'Единовременно', amount: 60000 },
                { currency: 'RUB', frequency: 'Ежегодно', amount: 12000 }
            ],

            // Минимальная страховая сумма
            minSums: [
                { currency: 'RUB', amount: 100000 }
            ],

            // Таблица "Лестничное КВ"
            kvStandard: [
                {
                    strategyCode: 'STD_BASE',
                    period: '01.01.2024 - бессрочно',
                    term: 5,
                    currency: 'RUB',
                    frequency: 'В конце срока',
                    variant: 'Базовая',
                    rateISG: '',
                    cashbackNSG: 35.00,
                    rko: 0.027,
                    ku: 100,
                    kv: 20.00
                }
            ]
        }
    },
    {
        id: 1703857200000, // 29.12.2023 12:00
        status: 'approval',
        createdAt: '2024-11-20T09:15:00.000Z',
        updatedAt: '2024-12-22T11:45:00.000Z',
        approvals: {
            'Продуктолог': { approved: true, comment: 'Все параметры заполнены корректно', date: '2024-12-21T10:00:00.000Z' },
            'Андеррайтер': { approved: true, comment: 'Страховые взносы согласованы', date: '2024-12-21T14:30:00.000Z' },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        statusHistory: [
            { status: 'draft', date: '2024-11-20T09:15:00.000Z', changedBy: 'Система' },
            { status: 'approval', date: '2024-12-21T09:00:00.000Z', changedBy: 'Иван Иванов' }
        ],
        data: {
            priority: '0',
            launchDate: '2024-06-01',
            closureDate: '',
            marketingName: 'Надежное решение Ультра 2.0',
            partner: 'ВТБ',
            newPartnerName: '',
            segment: 'Прайм',
            agencyCode: '76421',
            productGroup: 'ИСЖ',
            productCode: 'IISULTVTBPR',
            lkCardType: 'ИСЖ 2.0',
            productSubtype: 'Облигации',
            assetLinked: true,
            investmentStrategy: true,
            llob: '46204',

            currencies: ['RUB', 'USD'],
            frequencies: ['Единовременно', 'Ежегодно', 'Раз в месяц'],
            fixedRate: true,
            exchangeRate: '95.50',
            fixedPremiums: false,
            guaranteedIncome: true,
            evaluationContract: false,
            specialOffer: true,

            minPremiums: [
                { currency: 'RUB', frequency: 'Единовременно', amount: 100000 },
                { currency: 'RUB', frequency: 'Ежегодно', amount: 20000 },
                { currency: 'RUB', frequency: 'Раз в месяц', amount: 2000 },
                { currency: 'USD', frequency: 'Единовременно', amount: 1500 },
                { currency: 'USD', frequency: 'Ежегодно', amount: 300 },
                { currency: 'USD', frequency: 'Раз в месяц', amount: 30 }
            ],

            minSums: [
                { currency: 'RUB', amount: 500000 },
                { currency: 'USD', amount: 5000 }
            ],

            // Таблица "Лестничное КВ (ДСЖ и Активы)"
            kvAssets: [
                {
                    strategyCode: 'HIGH_YIELD',
                    period: '01.01.2024 - 31.12.2024',
                    term: 10,
                    currency: 'RUB',
                    frequency: 'Ежегодно',
                    variant: 'Акция',
                    assets: 'Облигации ОФЗ',
                    rateISG: 7.50,
                    cashbackNSG: '',
                    rko: 0.10,
                    ku: 100,
                    kv: 15.00
                },
                {
                    strategyCode: 'STABLE',
                    period: '01.01.2024 - бессрочно',
                    term: 5,
                    currency: 'USD',
                    frequency: 'В конце срока',
                    variant: 'Базовая',
                    assets: 'Еврооблигации',
                    rateISG: 5.00,
                    cashbackNSG: '',
                    rko: 0.05,
                    ku: 80,
                    kv: 18.00
                }
            ]
        }
    },
    {
        id: 1703943600000, // 30.12.2023 12:00
        status: 'approved',
        createdAt: '2024-10-05T14:20:00.000Z',
        updatedAt: '2024-12-18T16:10:00.000Z',
        approvals: {
            'Продуктолог': { approved: true, comment: 'Согласовано', date: '2024-12-16T10:00:00.000Z' },
            'Андеррайтер': { approved: true, comment: 'Согласовано', date: '2024-12-16T11:00:00.000Z' },
            'Актуарий': { approved: true, comment: 'Согласовано', date: '2024-12-17T09:00:00.000Z' },
            'Методолог': { approved: true, comment: 'Согласовано', date: '2024-12-18T14:00:00.000Z' }
        },
        statusHistory: [
            { status: 'draft', date: '2024-10-05T14:20:00.000Z', changedBy: 'Система' },
            { status: 'approval', date: '2024-12-16T09:00:00.000Z', changedBy: 'Петр Петров' },
            { status: 'approved', date: '2024-12-18T16:10:00.000Z', changedBy: 'Автоматическое согласование' }
        ],
        data: {
            priority: '3',
            launchDate: '2024-07-15',
            closureDate: '2027-07-15',
            marketingName: 'Базовый план 10+',
            partner: 'РОСБАНК',
            newPartnerName: '',
            segment: 'Розница',
            agencyCode: '98765',
            productGroup: 'НСЖ',
            productCode: 'NBPROSBANK',
            lkCardType: 'Базовая',
            productSubtype: 'Стандартный',
            assetLinked: false,
            investmentStrategy: false,
            llob: '36414',

            currencies: ['RUB'],
            frequencies: ['Единовременно', 'Ежегодно', 'Раз в полгода'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: true,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: false,

            minPremiums: [
                { currency: 'RUB', frequency: 'Единовременно', amount: 50000 },
                { currency: 'RUB', frequency: 'Ежегодно', amount: 10000 },
                { currency: 'RUB', frequency: 'Раз в полгода', amount: 5500 }
            ],

            minSums: [
                { currency: 'RUB', amount: 200000 }
            ],

            // Фиксированные премии
            fixedPremiumsData: [
                { frequency: 'Единовременно', term: 5, premium: 150000 },
                { frequency: 'Единовременно', term: 10, premium: 250000 },
                { frequency: 'Ежегодно', term: 5, premium: 30000 },
                { frequency: 'Ежегодно', term: 10, premium: 50000 }
            ],

            kvStandard: [
                {
                    strategyCode: 'BASIC_10',
                    period: '01.07.2024 - 15.07.2027',
                    term: 10,
                    currency: 'RUB',
                    frequency: 'Ежегодно',
                    variant: 'Стандарт',
                    rateISG: '',
                    cashbackNSG: 25.00,
                    rko: 0.02,
                    ku: 100,
                    kv: 22.00
                },
                {
                    strategyCode: 'BASIC_5',
                    period: '01.07.2024 - 15.07.2027',
                    term: 5,
                    currency: 'RUB',
                    frequency: 'Единовременно',
                    variant: 'Эконом',
                    rateISG: '',
                    cashbackNSG: 20.00,
                    rko: 0.015,
                    ku: 100,
                    kv: 25.00
                }
            ]
        }
    },
    {
        id: 1704030000000, // 31.12.2023 12:00
        status: 'sent',
        createdAt: '2024-09-10T08:00:00.000Z',
        updatedAt: '2024-12-25T10:00:00.000Z',
        approvals: {
            'Продуктолог': { approved: true, comment: 'Согласовано', date: '2024-12-20T10:00:00.000Z' },
            'Андеррайтер': { approved: true, comment: 'Согласовано', date: '2024-12-20T11:00:00.000Z' },
            'Актуарий': { approved: true, comment: 'Согласовано', date: '2024-12-21T09:00:00.000Z' },
            'Методолог': { approved: true, comment: 'Согласовано', date: '2024-12-22T14:00:00.000Z' }
        },
        statusHistory: [
            { status: 'draft', date: '2024-09-10T08:00:00.000Z', changedBy: 'Система' },
            { status: 'approval', date: '2024-12-20T09:00:00.000Z', changedBy: 'Ольга Смирнова' },
            { status: 'approved', date: '2024-12-22T16:00:00.000Z', changedBy: 'Автоматическое согласование' },
            { status: 'sent', date: '2024-12-25T10:00:00.000Z', changedBy: 'Система' }
        ],
        data: {
            priority: '0',
            launchDate: '2025-01-15',
            closureDate: '',
            marketingName: 'Накопительный капитал Премиум',
            partner: 'СОВКОМБАНК',
            newPartnerName: '',
            segment: 'VIP',
            agencyCode: '54321',
            productGroup: 'НСЖ',
            productCode: 'NKPREMSOV',
            lkCardType: 'Новая карточка',
            productSubtype: 'Премиум',
            assetLinked: false,
            investmentStrategy: false,
            llob: '20700',

            currencies: ['RUB', 'EUR', 'USD'],
            frequencies: ['Единовременно', 'Ежегодно'],
            fixedRate: true,
            exchangeRate: '102.30',
            fixedPremiums: false,
            guaranteedIncome: true,
            evaluationContract: true,
            specialOffer: false,

            minPremiums: [
                { currency: 'RUB', frequency: 'Единовременно', amount: 500000 },
                { currency: 'RUB', frequency: 'Ежегодно', amount: 100000 },
                { currency: 'EUR', frequency: 'Единовременно', amount: 5000 },
                { currency: 'EUR', frequency: 'Ежегодно', amount: 1000 },
                { currency: 'USD', frequency: 'Единовременно', amount: 5500 },
                { currency: 'USD', frequency: 'Ежегодно', amount: 1100 }
            ],

            minSums: [
                { currency: 'RUB', amount: 1000000 },
                { currency: 'EUR', amount: 10000 },
                { currency: 'USD', amount: 11000 }
            ],

            kvStandard: [
                {
                    strategyCode: 'PREMIUM_VIP',
                    period: '15.01.2025 - бессрочно',
                    term: 15,
                    currency: 'RUB',
                    frequency: 'В конце срока',
                    variant: 'VIP',
                    rateISG: '',
                    cashbackNSG: 40.00,
                    rko: 0.005,
                    ku: 100,
                    kv: 12.00
                },
                {
                    strategyCode: 'PREMIUM_EUR',
                    period: '15.01.2025 - бессрочно',
                    term: 10,
                    currency: 'EUR',
                    frequency: 'Ежегодно',
                    variant: 'VIP',
                    rateISG: '',
                    cashbackNSG: 35.00,
                    rko: 0.01,
                    ku: 100,
                    kv: 15.00
                }
            ]
        }
    },
    {
        id: 1704116400000, // 01.01.2024 12:00
        status: 'draft',
        createdAt: '2024-12-26T15:30:00.000Z',
        updatedAt: '2024-12-27T09:00:00.000Z',
        approvals: {
            'Продуктолог': { approved: false, comment: '', date: null },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        statusHistory: [
            { status: 'draft', date: '2024-12-26T15:30:00.000Z', changedBy: 'Система' }
        ],
        data: {
            priority: '2',
            launchDate: '2025-03-01',
            closureDate: '',
            marketingName: 'Инвестиционная защита 360',
            partner: 'ПОЧТАБАНК',
            newPartnerName: '',
            segment: 'Привилегия',
            agencyCode: '11223',
            productGroup: 'ИСЖ',
            productCode: 'IIZ360POST',
            lkCardType: 'ИСЖ 2.0',
            productSubtype: 'Смешанный портфель',
            assetLinked: true,
            investmentStrategy: true,
            llob: '46204',

            currencies: ['RUB'],
            frequencies: ['Единовременно', 'Ежегодно', 'Раз в квартал'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: true,

            minPremiums: [
                { currency: 'RUB', frequency: 'Единовременно', amount: 200000 },
                { currency: 'RUB', frequency: 'Ежегодно', amount: 40000 },
                { currency: 'RUB', frequency: 'Раз в квартал', amount: 11000 }
            ],

            minSums: [
                { currency: 'RUB', amount: 800000 }
            ],

            kvAssets: [
                {
                    strategyCode: 'INVEST360',
                    period: '01.03.2025 - бессрочно',
                    term: 7,
                    currency: 'RUB',
                    frequency: 'Ежегодно',
                    variant: 'Премиум',
                    assets: 'Акции + Облигации',
                    rateISG: 8.50,
                    cashbackNSG: '',
                    rko: 0.08,
                    ku: 90,
                    kv: 14.00
                }
            ]
        }
    }
];

// Функция для загрузки тестовых данных
function loadTestData() {
    const existing = localStorage.getItem('insurance_products');

    // Если данных нет или пользователь хочет сбросить
    if (!existing) {
        localStorage.setItem('insurance_products', JSON.stringify(TEST_PRODUCTS));
        console.log('✅ Загружено 5 тестовых продуктов');
        return TEST_PRODUCTS;
    }

    return JSON.parse(existing);
}

// Функция для сброса данных (для тестирования)
function resetTestData() {
    localStorage.setItem('insurance_products', JSON.stringify(TEST_PRODUCTS));
    console.log('🔄 Данные сброшены к тестовым');
    location.reload();
}

// Экспорт для использования в app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEST_PRODUCTS, loadTestData, resetTestData };
}
