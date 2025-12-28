import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Copy, Star, TrendingUp } from 'lucide-react';
import type { TaskTemplate, CreateTaskInput, TaskPriority } from '../../types/taskEnhanced';
import type { TaskCategory } from '../../types/task';
import {
  getTaskTemplates,
  createTaskTemplate,
  deleteTaskTemplate,
  createTaskFromTemplate,
} from '../../services/taskEnhanced.service';
import { LoadingSpinner } from '../LoadingSpinner';

interface TaskTemplateManagerProps {
  userId: string;
  sectionId?: string;
  onCreateFromTemplate?: (taskInput: CreateTaskInput) => void;
}

export function TaskTemplateManager({
  userId,
  sectionId,
  onCreateFromTemplate,
}: TaskTemplateManagerProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [sectionId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTaskTemplates(sectionId);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteTaskTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const handleUseTemplate = async (template: TaskTemplate) => {
    try {
      const task = await createTaskFromTemplate(userId, template.id);
      alert(`Task "${task.name}" created from template!`);
      if (onCreateFromTemplate) {
        onCreateFromTemplate({
          name: task.name,
          description: task.description,
          category: task.category,
          dueDate: task.dueDate,
          priority: task.priority,
          tags: task.tags,
        });
      }
    } catch (error) {
      console.error('Failed to create task from template:', error);
      alert('Failed to create task from template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Templates</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create and manage reusable task templates
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateTemplateModal
          userId={userId}
          sectionId={sectionId}
          onClose={() => setShowCreateForm(false)}
          onCreated={(template) => {
            setTemplates([template, ...templates]);
            setShowCreateForm(false);
          }}
        />
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first template to quickly generate tasks
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template)}
              onDelete={() => handleDeleteTemplate(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: TaskTemplate;
  onUse: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onUse, onDelete }: TemplateCardProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[template.priority]}`}>
            {template.priority.toUpperCase()}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {template.category.replace('-', ' ')}
          </span>
        </div>

        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <TrendingUp className="w-3 h-3" />
          <span>Used {template.useCount} times</span>
          <span>•</span>
          <span>Due in {template.defaultDueDays} days</span>
        </div>
      </div>

      <button
        onClick={onUse}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Copy className="w-4 h-4" />
        Use Template
      </button>
    </div>
  );
}

interface CreateTemplateModalProps {
  userId: string;
  sectionId?: string;
  onClose: () => void;
  onCreated: (template: TaskTemplate) => void;
}

function CreateTemplateModal({ userId, sectionId, onClose, onCreated }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'assignment' as TaskCategory,
    priority: 'medium' as TaskPriority,
    tags: '',
    defaultDueDays: 7,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const template = await createTaskTemplate(userId, {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        priority: formData.priority,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        defaultDueDays: formData.defaultDueDays,
        sectionId: sectionId || null,
        createdBy: userId,
        isActive: true,
      });
      onCreated(template);
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Create Task Template
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Weekly Assignment Template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Template description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
                <option value="presentation">Presentation</option>
                <option value="project">Project</option>
                <option value="lab-report">Lab Report</option>
                <option value="midterm">Midterm</option>
                <option value="final-exam">Final Exam</option>
                <option value="task">Task</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Due Days *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.defaultDueDays}
              onChange={(e) => setFormData({ ...formData, defaultDueDays: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of days from creation date for due date
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., important, weekly, math"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
