'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Topic {
  id: string;
  label: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  topics: Topic[];
}

const MOCK_CATEGORIES: Category[] = [
  {
    id: 'trending',
    title: '热搜聚合',
    icon: '🌐',
    topics: [
      { id: 't1', label: '建立月球基地' },
      { id: 't2', label: '大语言模型 Agents' },
      { id: 't3', label: 'CRISPR 基因编辑' },
      { id: 't4', label: '室温超导技术' },
    ],
  },
  {
    id: 'ai-tech',
    title: '今日头条',
    icon: '🚀',
    topics: [
      { id: 'a1', label: '自动驾驶系统' },
      { id: 'a2', label: '脑机接口 (BCI)' },
      { id: 'a3', label: '空间智能与具身智能' },
      { id: 'a4', label: '量子计算突破' },
    ],
  },
  {
    id: 'space-physics',
    title: '36氪',
    icon: '🔬',
    topics: [
      { id: 's1', label: '火星探测计划' },
      { id: 's2', label: '暗物质探测' },
      { id: 's3', label: '系外行星寻找' },
      { id: 's4', label: '可控核聚变' },
    ],
  },
  {
    id: 'interdisciplinary',
    title: '虎嗅',
    icon: '💡',
    topics: [
      { id: 'i1', label: 'AI 与医疗诊断' },
      { id: 'i2', label: '科技与社会伦理' },
      { id: 'i3', label: '计算金融学' },
      { id: 'i4', label: '数字人文学科' },
    ],
  },
];

export function InterestSelector() {
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [customKeyword, setCustomKeyword] = useState('');

  const toggleTopic = (id: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddCustom = () => {
    if (customKeyword.trim()) {
      // Create a mock ID for the new custom keyword
      const newId = `custom-${Date.now()}`;
      setSelectedTopicIds(prev => {
        const next = new Set(prev);
        next.add(newId);
        return next;
      });
      setCustomKeyword('');
    }
  };

  return (
    <div className="mb-8 rounded-[12px] border border-[#E0D8CC] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mb-6 text-center">
        <h2 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A] sm:text-[32px] flex items-center justify-center gap-2">
          <span className="text-[#2C5F7C]">✨</span> 输入关键词
        </h2>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          告诉我们您感兴趣的研究方向，大模型将为您实时匹配相关领域的顶尖导师与项目
        </p>
      </div>

      <div className="mx-auto mb-8 flex max-w-4xl items-center gap-2 rounded-[8px] border border-[#E0D8CC] bg-[#FAF8F5] p-1.5 focus-within:border-[#2C5F7C] focus-within:ring-1 focus-within:ring-[#2C5F7C] transition-all">
        <input
          type="text"
          placeholder="例如：人工智能、建立月球基地、量子计算..."
          value={customKeyword}
          onChange={e => setCustomKeyword(e.target.value)}
          className="flex-1 bg-transparent px-4 py-2 text-sm text-[#1A1A1A] outline-none placeholder:text-[#8a8178]"
          onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
        />
        <Button onClick={handleAddCustom} variant="gold" className="shrink-0 h-[38px] px-6 text-[13px]">
          + 添加
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_CATEGORIES.map(category => (
          <div key={category.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#E0D8CC] pb-2">
              <span className="text-lg">{category.icon}</span>
              <h3 className="text-[15px] font-semibold text-[#2C5F7C]">{category.title}</h3>
            </div>
            
            <div className="flex flex-col gap-2.5">
              {category.topics.map(topic => {
                const isSelected = selectedTopicIds.has(topic.id);
                return (
                  <div
                    key={topic.id}
                    className={`group flex items-center justify-between rounded-[8px] border p-3 transition-all duration-200 ${
                      isSelected
                        ? 'border-[#2C5F7C] bg-[#F3FAFD]'
                        : 'border-[#E0D8CC] bg-[#FFFEFB] hover:border-[#8b603b] hover:shadow-[0_4px_12px_rgba(139,96,59,0.06)]'
                    }`}
                  >
                    <span className={`text-[13px] line-clamp-1 mr-2 ${isSelected ? 'font-semibold text-[#2C5F7C]' : 'text-[#4A4A4A] group-hover:text-[#1A1A1A]'}`}>
                      {topic.label}
                    </span>
                    <button
                      onClick={() => toggleTopic(topic.id)}
                      className={`flex h-7 shrink-0 items-center justify-center rounded-[4px] px-2.5 text-[12px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-[#2C5F7C] text-white hover:bg-[#1f455c]'
                          : 'bg-[#F5F2ED] text-[#6B6B6B] border border-transparent hover:border-[#8b603b] hover:bg-white hover:text-[#8b603b]'
                      }`}
                    >
                      {isSelected ? '已添加' : '+ 添加'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
