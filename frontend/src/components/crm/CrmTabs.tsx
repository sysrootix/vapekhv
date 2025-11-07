import { BarChart3, Users, TrendingUp, Send } from 'lucide-react';

export type CrmTabId = 'overview' | 'users' | 'analytics' | 'broadcasts';

interface CrmTabsProps {
  activeTab: CrmTabId;
  onTabChange: (tab: CrmTabId) => void;
}

export function CrmTabs({ activeTab, onTabChange }: CrmTabsProps) {
  const tabs = [
    { id: 'overview' as CrmTabId, label: 'Обзор', icon: BarChart3 },
    { id: 'users' as CrmTabId, label: 'Пользователи', icon: Users },
    { id: 'analytics' as CrmTabId, label: 'Аналитика', icon: TrendingUp },
    { id: 'broadcasts' as CrmTabId, label: 'Рассылки', icon: Send },
  ];

  return (
    <div className="sticky top-0 z-40 bg-tg-secondary-bg border-b border-tg-button/10 backdrop-blur-sm">
      <div className="flex gap-1 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium transition-all
                ${isActive 
                  ? 'bg-tg-button text-tg-button-text shadow-lg' 
                  : 'text-tg-hint hover:bg-tg-bg'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

