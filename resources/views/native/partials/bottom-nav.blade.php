@php($badge = $dueCount ?? 0)
<native:bottom-nav>
    <native:bottom-nav-item id="home" label="خانه" url="/" :ios-icon="'house'" :android-icon="'home'" />
    <native:bottom-nav-item id="transactions" label="تراکنش‌ها" url="/transactions" :ios-icon="'list.bullet.rectangle'" :android-icon="'receipt_long'" />
    <native:bottom-nav-item id="obligations" label="تعهدات" url="/obligations" :ios-icon="'calendar.badge.clock'" :android-icon="'event_note'" badge="{{ $badge > 0 ? (string) $badge : '' }}" />
    <native:bottom-nav-item id="investments" label="سرمایه" url="/investments" :ios-icon="'chart.line.uptrend.xyaxis'" :android-icon="'trending_up'" />
    <native:bottom-nav-item id="more" label="بیشتر" url="/more" :ios-icon="'ellipsis.circle'" :android-icon="'more_horiz'" />
</native:bottom-nav>
