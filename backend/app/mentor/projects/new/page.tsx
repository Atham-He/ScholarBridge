/**
 * 新建项目页面
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    researchArea: '',
    startTime: '',
    endTime: '',
    location: '',
    requirements: '',
    capacity: 1,
  });

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/mentor/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建失败');
      }

      router.push('/mentor/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] overflow-y-auto">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px]">
        <div
          className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer"
          onClick={() => router.push('/mentor')}
        >
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn text-[#1A1A1A]" onClick={() => router.push('/mentor')}>Dashboard</button>
          <button className="nav-btn active">New Project</button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/mentor/projects" className="text-[#2C5F7C] hover:underline text-sm">
            ← 返回项目列表
          </Link>
          <h2 className="font-display text-[32px] font-semibold text-[#1A1A1A] tracking-[-0.02em] mt-4">
            新建项目
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E0D8CC] rounded-[10px] p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                placeholder="例如：PhD — AI Safety Research"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                项目简介 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                placeholder="描述项目的研究内容、目标和期望..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                研究方向 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.researchArea}
                onChange={(e) => handleChange('researchArea', e.target.value)}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                placeholder="例如：Machine Learning"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  开始时间 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  结束时间
                </label>
                <input
                  type="date"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                工作地点/方式
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                placeholder="例如：On-site, Remote, 或具体地点"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                研究要求
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => handleChange('requirements', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                placeholder="对申请者的要求、技能期望等..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                招募人数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/mentor/projects">
                <button
                  type="button"
                  className="px-6 py-3 border border-[#E0D8CC] rounded-lg hover:border-[#2C5F7C] hover:text-[#2C5F7C] transition-all"
                >
                  取消
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#2C5F7C] text-white rounded-lg hover:bg-[#1a4a5f] transition-colors disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建项目'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
        .nav-btn {
          @apply bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C];
        }
        .nav-btn.active {
          @apply bg-[#2C5F7C] text-white border-[#2C5F7C];
        }
      `}</style>
    </div>
  );
}
