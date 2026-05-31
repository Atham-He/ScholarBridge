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
    id: 'computing',
    title: '前沿计算与人工智能',
    icon: '💻',
    topics: [
      { id: 'c1', label: '大语言模型 Agents' },
      { id: 'c2', label: '具身智能 (Embodied AI)' },
      { id: 'c3', label: '量子计算突破' },
      { id: 'c4', label: '可信人工智能' },
    ],
  },
  {
    id: 'life-science',
    title: '生命科学与医学',
    icon: '🧬',
    topics: [
      { id: 'l1', label: 'CRISPR 基因编辑' },
      { id: 'l2', label: '脑机接口 (BCI)' },
      { id: 'l3', label: '合成生物学' },
      { id: 'l4', label: '靶向药物递送' },
    ],
  },
  {
    id: 'physics-space',
    title: '航空航天与物理',
    icon: '🚀',
    topics: [
      { id: 'p1', label: '建立月球基地' },
      { id: 'p2', label: '可控核聚变' },
      { id: 'p3', label: '暗物质探测' },
      { id: 'p4', label: '室温超导技术' },
    ],
  },
  {
    id: 'interdisciplinary',
    title: '交叉学科与应用',
    icon: '🌐',
    topics: [
      { id: 'i1', label: 'AI 与医疗诊断' },
      { id: 'i2', label: '科技与社会伦理' },
      { id: 'i3', label: '计算金融学' },
      { id: 'i4', label: '气候变化建模' },
    ],
  },
];

export function InterestSelector() {
  const [selectedTopics, setSelectedTopics] = useState<Map<string, string>>(new Map());
  const [customKeyword, setCustomKeyword] = useState('');

  const toggleTopic = (id: string, label: string) => {
    setSelectedTopics(prev => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, label);
      }
      return next;
    });
  };

  const handleAddCustom = () => {
    const keyword = customKeyword.trim();
    if (keyword) {
      const newId = `custom-${Date.now()}`;
      setSelectedTopics(prev => {
        const next = new Map(prev);
        // 检查是否已经存在相同名称的词条（不区分大小写）
        const exists = Array.from(next.values()).some(
          val => val.toLowerCase() === keyword.toLowerCase()
        );
        if (!exists) {
          next.set(newId, keyword);
        }
        return next;
      });
      setCustomKeyword('');
    }
  };

  const removeTopic = (id: string) => {
    setSelectedTopics(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="mb-8 rounded-[12px] border border-[#E0D8CC] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mb-6 text-center">
        <h2 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A] sm:text-[32px] flex items-center justify-center gap-2">
          <span className="text-[#2C5F7C]">✨</span> 探索研究方向
        </h2>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          选择或输入您感兴趣的领域，我们将为您实时匹配相关的顶尖导师与科研项目
        </p>
      </div>

      <div className="mx-auto mb-6 flex max-w-3xl items-center gap-2 rounded-[8px] border border-[#E0D8CC] bg-[#FAF8F5] p-1.5 focus-within:border-[#2C5F7C] focus-within:ring-1 focus-within:ring-[#2C5F7C] transition-all">
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

      {selectedTopics.size > 0 && (
        <div className="mx-auto max-w-4xl mb-8 flex flex-wrap items-center justify-center gap-2 rounded-[8px] bg-[#F9FBFC] p-4 border border-[#EBF3F8]">
          <span className="text-sm font-semibold text-[#2C5F7C] mr-2">已选方向：</span>
          {Array.from(selectedTopics.entries()).map(([id, label]) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2C5F7C] pl-3 pr-1 py-1 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#1f455c]"
            >
              {label}
              <button
                onClick={() => removeTopic(id)}
                className="ml-0.5 rounded-full p-1 hover:bg-white/20 transition-colors"
                aria-label={`Remove ${label}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_CATEGORIES.map(category => (
          <div key={category.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#E0D8CC] pb-2">
              <span className="text-lg">{category.icon}</span>
              <h3 className="text-[15px] font-semibold text-[#2C5F7C]">{category.title}</h3>
            </div>
            
            <div className="flex flex-col gap-2.5">
              {category.topics.map(topic => {
                const isSelected = selectedTopics.has(topic.id);
                return (
                  <div
                    key={topic.id}
                    className={`group flex items-center justify-between rounded-[8px] border p-2.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-[#2C5F7C] bg-[#F3FAFD]'
                        : 'border-[#E0D8CC] bg-[#FFFEFB] hover:border-[#8b603b] hover:shadow-[0_4px_12px_rgba(139,96,59,0.06)]'
                    }`}
                    onClick={() => toggleTopic(topic.id, topic.label)}
                  >
                    <span className={`text-[13px] line-clamp-1 mr-2 ${isSelected ? 'font-semibold text-[#2C5F7C]' : 'text-[#4A4A4A] group-hover:text-[#1A1A1A]'}`}>
                      {topic.label}
                    </span>
                    <button
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[14px] transition-colors ${
                        isSelected
                          ? 'bg-[#2C5F7C] text-white'
                          : 'bg-[#F5F2ED] text-[#6B6B6B] border border-transparent group-hover:bg-[#8b603b] group-hover:text-white'
                      }`}
                    >
                      {isSelected ? (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m-6-6h12"></path>
                        </svg>
                      )}
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
