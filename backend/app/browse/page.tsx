/**
 * Browse页面 - 浏览导师列表 (ScholarBridge设计)
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface Mentor {
  id: string;
  slug: string;
  title: string;
  mentor: {
    displayName: string;
    institution: string;
    initials: string;
  };
  tags: string[];
  openPositionsCount: number;
  hIndex?: number;
  agent: {
    active: boolean;
  };
}

export default function BrowsePage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const response = await fetch('/api/skills');
      const data = await response.json();
      if (data.skills) {
        setMentors(data.skills);
      }
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = !searchQuery ||
      mentor.mentor.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.mentor.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || mentor.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(mentors.flatMap(m => m.tags || []))).slice(0, 8);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2C5F7C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#6B6B6B]">Loading mentors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px]">
        <div className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer" onClick={() => window.location.href = '/'}>
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn active">Discover</button>
          <button className="nav-btn" onClick={() => window.location.href = '/applications'}>My Applications</button>
          <Button variant="gold" size="sm">Sign In</Button>
        </div>
      </nav>

      <div className="py-8 px-10">
        {/* 标题区域 */}
        <div className="mb-8">
          <p className="text-xs tracking-[0.08em] uppercase text-[#2C5F7C] mb-2 font-semibold">Student Portal</p>
          <h2 className="font-display text-[32px] mb-2 font-semibold text-[#1A1A1A] tracking-[-0.02em]">
            Discover Research Mentors
          </h2>
          <p className="text-[14px] text-[#6B6B6B]">
            Explore faculty profiles and chat with their AI agents to learn about open positions and research fit.
          </p>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, topic, or institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 py-[11px] px-4 border border-[#E0D8CC] rounded text-[14px] font-family-body outline-none transition-all duration-200 ease bg-white focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          />
          <Button variant="gold">Search</Button>
          <Button variant="outline">Filters</Button>
        </div>

        {/* 标签筛选 */}
        <div className="flex gap-2.5 flex-wrap mb-7">
          <div
            className={`py-[7px] px-4 rounded-full text-[13px] border cursor-pointer transition-all duration-200 ease font-medium ${selectedTag === null ? 'bg-[#2C5F7C] border-[#2C5F7C] text-white' : 'bg-white border-[#E0D8CC] text-[#6B6B6B]'}`}
            onClick={() => setSelectedTag(null)}
          >
            All Fields
          </div>
          {allTags.map(tag => (
            <div
              key={tag}
              className={`py-[7px] px-4 rounded-full text-[13px] border cursor-pointer transition-all duration-200 ease font-medium ${selectedTag === tag ? 'bg-[#2C5F7C] border-[#2C5F7C] text-white' : 'bg-white border-[#E0D8CC] text-[#6B6B6B]'}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </div>
          ))}
          <div className={`py-[7px] px-4 rounded-full text-[13px] border cursor-pointer transition-all duration-200 ease font-medium bg-white border-[#E0D8CC] text-[#6B6B6B]`}>
            Open Positions Only
          </div>
        </div>

        {/* 导师网格 */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {filteredMentors.map((mentor) => (
            <div
              key={mentor.id}
              className="bg-white border border-[#E0D8CC] rounded-[10px] p-6 cursor-pointer transition-all duration-250 ease hover:border-[#2C5F7C] hover:-translate-y-0.75 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              onClick={() => window.location.href = `/s/${mentor.slug}`}
            >
              {/* 导师信息 */}
              <div className="flex gap-3.5 items-start mb-4">
                <Avatar name={mentor.mentor.displayName} size="md" />
                <div className="flex-1">
                  <h4 className="text-[16px] font-semibold text-[#1A1A1A] mb-1">{mentor.title}</h4>
                  <p className="text-[13px] text-[#6B6B6B]">{mentor.mentor.institution}</p>
                  {mentor.agent.active && (
                    <div className="mt-1.5">
                      <Badge variant="green" dot>
                        Agent Active
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* 研究标签 */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(mentor.tags || []).slice(0, 3).map(tag => (
                  <span key={tag} className="bg-[#F5F2ED] border border-[#E0D8CC] text-[#6B6B6B] text-[11px] py-1 px-2.5 rounded font-medium tracking-[0.01em]">
                    {tag}
                  </span>
                ))}
              </div>

              {/* 统计信息 */}
              <div className="flex justify-between items-center">
                <div className="flex gap-4 text-[12px] text-[#6B6B6B] font-medium">
                  <span className="flex items-center gap-1">
                    {mentor.openPositionsCount} open position{mentor.openPositionsCount !== 1 ? 's' : ''}
                  </span>
                  {mentor.hIndex && (
                    <span>h-index {mentor.hIndex}</span>
                  )}
                </div>
                <button
                  className="text-[11px] py-2 px-3 rounded border border-[#E0D8CC] bg-transparent text-[#6B6B6B] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/c/${mentor.slug}`;
                  }}
                >
                  Chat Agent →
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMentors.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#6B6B6B] text-[14px]">No mentors found matching your criteria.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setSelectedTag(null);
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* 自定义样式 */}
      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
        .font-family-body {
          font-family: 'DM Sans', sans-serif;
        }
        .nav-btn {
          @apply bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease font-family-body hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)];
        }
        .nav-btn.active {
          @apply bg-[#2C5F7C] text-white border-[#2C5F7C];
        }
      `}</style>
    </div>
  );
}
