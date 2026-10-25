<?php

namespace App\Support;

class DefaultCategories
{
    /**
     * @return list<array{slug: string, name: string, kind: string, icon: string, color: string, parent: string|null}>
     */
    public static function all(): array
    {
        return [
            ['slug' => 'food', 'name' => 'خوراک و رستوران', 'kind' => 'expense', 'icon' => 'restaurant', 'color' => '#EA580C', 'parent' => null],
            ['slug' => 'groceries', 'name' => 'سوپرمارکت', 'kind' => 'expense', 'icon' => 'shopping_cart', 'color' => '#F97316', 'parent' => 'food'],
            ['slug' => 'restaurant', 'name' => 'رستوران و کافه', 'kind' => 'expense', 'icon' => 'local_cafe', 'color' => '#D97706', 'parent' => 'food'],
            ['slug' => 'fruit', 'name' => 'میوه و سبزیجات', 'kind' => 'expense', 'icon' => 'eco', 'color' => '#65A30D', 'parent' => 'food'],
            ['slug' => 'household', 'name' => 'شوینده و خانه', 'kind' => 'expense', 'icon' => 'cleaning_services', 'color' => '#B45309', 'parent' => 'food'],

            ['slug' => 'housing', 'name' => 'مسکن و قبوض', 'kind' => 'expense', 'icon' => 'home', 'color' => '#4F46E5', 'parent' => null],
            ['slug' => 'rent', 'name' => 'اجاره و رهن', 'kind' => 'expense', 'icon' => 'apartment', 'color' => '#6366F1', 'parent' => 'housing'],
            ['slug' => 'bills', 'name' => 'آب، برق و گاز', 'kind' => 'expense', 'icon' => 'bolt', 'color' => '#4338CA', 'parent' => 'housing'],
            ['slug' => 'internet', 'name' => 'اینترنت و تلفن', 'kind' => 'expense', 'icon' => 'wifi', 'color' => '#7C3AED', 'parent' => 'housing'],

            ['slug' => 'transport', 'name' => 'حمل و نقل', 'kind' => 'expense', 'icon' => 'directions_car', 'color' => '#0284C7', 'parent' => null],
            ['slug' => 'fuel', 'name' => 'بنزین', 'kind' => 'expense', 'icon' => 'local_gas_station', 'color' => '#0EA5E9', 'parent' => 'transport'],
            ['slug' => 'taxi', 'name' => 'تاکسی و اسنپ', 'kind' => 'expense', 'icon' => 'local_taxi', 'color' => '#2563EB', 'parent' => 'transport'],
            ['slug' => 'car_service', 'name' => 'تعمیر و سرویس خودرو', 'kind' => 'expense', 'icon' => 'build', 'color' => '#0369A1', 'parent' => 'transport'],
            ['slug' => 'insurance', 'name' => 'بیمه خودرو', 'kind' => 'expense', 'icon' => 'verified_user', 'color' => '#1D4ED8', 'parent' => 'transport'],

            ['slug' => 'health', 'name' => 'سلامت', 'kind' => 'expense', 'icon' => 'favorite', 'color' => '#E11D48', 'parent' => null],
            ['slug' => 'pharmacy', 'name' => 'دارو', 'kind' => 'expense', 'icon' => 'medication', 'color' => '#F43F5E', 'parent' => 'health'],
            ['slug' => 'doctor', 'name' => 'پزشک و درمان', 'kind' => 'expense', 'icon' => 'medical_services', 'color' => '#BE123C', 'parent' => 'health'],
            ['slug' => 'dentist', 'name' => 'دندانپزشکی', 'kind' => 'expense', 'icon' => 'sentiment_satisfied', 'color' => '#9F1239', 'parent' => 'health'],

            ['slug' => 'personal', 'name' => 'پوشاک و شخصی', 'kind' => 'expense', 'icon' => 'checkroom', 'color' => '#A855F7', 'parent' => null],
            ['slug' => 'clothing', 'name' => 'لباس و کفش', 'kind' => 'expense', 'icon' => 'checkroom', 'color' => '#C026D3', 'parent' => 'personal'],
            ['slug' => 'beauty', 'name' => 'آرایش و بهداشت', 'kind' => 'expense', 'icon' => 'spa', 'color' => '#D946EF', 'parent' => 'personal'],
            ['slug' => 'digital', 'name' => 'دیجیتال و لوازم', 'kind' => 'expense', 'icon' => 'devices', 'color' => '#9333EA', 'parent' => 'personal'],

            ['slug' => 'fun', 'name' => 'تفریح و سفر', 'kind' => 'expense', 'icon' => 'flight', 'color' => '#0D9488', 'parent' => null],
            ['slug' => 'travel', 'name' => 'سفر و اقامت', 'kind' => 'expense', 'icon' => 'flight', 'color' => '#14B8A6', 'parent' => 'fun'],
            ['slug' => 'entertainment', 'name' => 'تفریح و سرگرمی', 'kind' => 'expense', 'icon' => 'celebration', 'color' => '#059669', 'parent' => 'fun'],
            ['slug' => 'subscription', 'name' => 'اشتراک‌ها', 'kind' => 'expense', 'icon' => 'subscriptions', 'color' => '#0891B2', 'parent' => 'fun'],

            ['slug' => 'education', 'name' => 'آموزش', 'kind' => 'expense', 'icon' => 'school', 'color' => '#CA8A04', 'parent' => null],
            ['slug' => 'course', 'name' => 'دوره و کلاس', 'kind' => 'expense', 'icon' => 'school', 'color' => '#EAB308', 'parent' => 'education'],
            ['slug' => 'books', 'name' => 'کتاب و منابع', 'kind' => 'expense', 'icon' => 'menu_book', 'color' => '#A16207', 'parent' => 'education'],

            ['slug' => 'gifts', 'name' => 'هدیه و کمک', 'kind' => 'expense', 'icon' => 'card_giftcard', 'color' => '#DB2777', 'parent' => null],
            ['slug' => 'family_gift', 'name' => 'هدیه خانواده', 'kind' => 'expense', 'icon' => 'card_giftcard', 'color' => '#EC4899', 'parent' => 'gifts'],
            ['slug' => 'charity', 'name' => 'کمک و خیریه', 'kind' => 'expense', 'icon' => 'volunteer_activism', 'color' => '#F472B6', 'parent' => 'gifts'],

            ['slug' => 'loan_interest', 'name' => 'سود و کارمزد وام', 'kind' => 'expense', 'icon' => 'percent', 'color' => '#DC2626', 'parent' => null],
            ['slug' => 'tax', 'name' => 'مالیات و عوارض', 'kind' => 'expense', 'icon' => 'receipt_long', 'color' => '#78716C', 'parent' => null],
            ['slug' => 'other', 'name' => 'سایر هزینه‌ها', 'kind' => 'expense', 'icon' => 'category', 'color' => '#64748B', 'parent' => null],

            ['slug' => 'income_salary', 'name' => 'حقوق و دستمزد', 'kind' => 'income', 'icon' => 'work', 'color' => '#16A34A', 'parent' => null],
            ['slug' => 'income_freelance', 'name' => 'پروژه و مشاوره', 'kind' => 'income', 'icon' => 'laptop_mac', 'color' => '#059669', 'parent' => null],
            ['slug' => 'income_invest', 'name' => 'سود سرمایه‌گذاری', 'kind' => 'income', 'icon' => 'trending_up', 'color' => '#0D9488', 'parent' => null],
            ['slug' => 'income_deposit', 'name' => 'سود سپرده', 'kind' => 'income', 'icon' => 'account_balance', 'color' => '#0F766E', 'parent' => 'income_invest'],
            ['slug' => 'income_fund', 'name' => 'سود صندوق', 'kind' => 'income', 'icon' => 'pie_chart', 'color' => '#115E59', 'parent' => 'income_invest'],
            ['slug' => 'income_dividend', 'name' => 'سود سهام', 'kind' => 'income', 'icon' => 'payments', 'color' => '#047857', 'parent' => 'income_invest'],
            ['slug' => 'income_sale', 'name' => 'فروش دارایی', 'kind' => 'income', 'icon' => 'sell', 'color' => '#65A30D', 'parent' => null],
            ['slug' => 'income_gift', 'name' => 'هدیه و کمک‌هزینه', 'kind' => 'income', 'icon' => 'redeem', 'color' => '#CA8A04', 'parent' => null],
            ['slug' => 'income_other', 'name' => 'سایر درآمدها', 'kind' => 'income', 'icon' => 'add_circle', 'color' => '#4D7C0F', 'parent' => null],
        ];
    }
}
