/**
 * 编辑项目页面
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  researchArea: string;
  startTime: string;
  endTime?: string;
  location?: string;
  requirements?: string;
  capacity: number;
  enrolled: number;
  status: string;
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        throw new Error('项目不存在');
      }

      const data = await response.json();
      const project = data.project;

      // 格式化日期为 YYYY-MM-DD 格式以适配 date input
      const formatDateString = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        // 如果已经是 YYYY-MM-DD 格式，直接返回
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // 如果是 YYYY-MM 格式，补全为 YYYY-MM-01
        if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
        return dateStr;
      };

      setFormData({
        title: project.title,
        description: project.description,
        researchArea: project.researchArea,
        startTime: formatDateString(project.startTime),
        endTime: formatDateString(project.endTime || ''),
        location: project.location || '',
        requirements: project.requirements || '',
        capacity: project.capacity,
      });
    } catch (err) {
      setError('加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新失败');
      }

      router.push('/mentor/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2C5F7C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#1A1A1A]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] overflow-y-auto">
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px]">
        <div
          className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer"
          onClick={() => router.push('/mentor')}
        >
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn text-[#1A1A1A]" onClick={() => router.push('/mentor')}>Dashboard</button>
          <button className="nav-btn active">Edit Project</button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/mentor/projects" className="text-[#2C5F7C] hover:underline text-sm">
            ← 返回项目列表
          </Link>
          <h2 className="font-display text-[32px] font-semibold text-[#1A1A1A] tracking-[-0.02em] mt-4">
            编辑项目
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
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">结束时间</label>
                <input
                  type="date"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">工作地点/方式</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">研究要求</label>
              <textarea
                value={formData.requirements}
                onChange={(e) => handleChange('requirements', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
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
                disabled={saving}
                className="px-6 py-3 bg-[#2C5F7C] text-white rounded-lg hover:bg-[#1a4a5f] transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存更改'}
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
