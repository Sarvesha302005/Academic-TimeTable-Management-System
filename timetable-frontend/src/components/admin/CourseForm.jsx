import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const ALL_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const CourseForm = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    year: 1,
    courseType: 'theory',
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 0,
    weeklyHours: 3,
    department: '',
    isElective: false,
    sections: [] // ✅ MULTI-SECTION
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getCourses();
      setCourses(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.sections.length === 0) {
      setError('Please select at least one section');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await adminAPI.createCourse(formData);

      await fetchCourses();

      setFormData({
        courseCode: '',
        courseName: '',
        year: 1,
        courseType: 'theory',
        lectureHours: 3,
        tutorialHours: 0,
        practicalHours: 0,
        weeklyHours: 3,
        department: '',
        isElective: false,
        sections: []
      });

      alert('Course and sections created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course and all its sections?')) return;

    try {
      setLoading(true);
      await adminAPI.deleteCourse(id);
      await fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Create Course</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* CODE + NAME */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Course Code</label>
              <input
                className="input-field"
                value={formData.courseCode}
                onChange={e => setFormData({ ...formData, courseCode: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Course Name</label>
              <input
                className="input-field"
                value={formData.courseName}
                onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                required
              />
            </div>
          </div>

          {/* YEAR + TYPE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Year</label>
              <select
                className="input-field"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Course Type</label>
              <select
                className="input-field"
                value={formData.courseType}
                onChange={e => setFormData({ ...formData, courseType: e.target.value })}
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>
          </div>

          {/* HOURS */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">Lecture Hours</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={formData.lectureHours}
                onChange={e =>
                  setFormData({ ...formData, lectureHours: +e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Tutorial Hours</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={formData.tutorialHours}
                onChange={e =>
                  setFormData({ ...formData, tutorialHours: +e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Practical / Lab Hours</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={formData.practicalHours}
                onChange={e =>
                  setFormData({ ...formData, practicalHours: +e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Total Weekly Hours</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.weeklyHours}
                onChange={e =>
                  setFormData({ ...formData, weeklyHours: +e.target.value })
                }
                required
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 my-2">
            <input
              type="checkbox"
              checked={formData.isElective}
              onChange={e => setFormData({ ...formData, isElective: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="font-medium text-gray-700">Is this an Elective Course? (Common Slot across sections)</span>
          </label>

          {/* SECTIONS MULTI SELECT */}
          <div>
            <label className="label">Sections</label>
            <div className="flex flex-wrap gap-3 mt-2">
              {ALL_SECTIONS.map(sec => (
                <label key={sec} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.sections.includes(sec)}
                    onChange={() => toggleSection(sec)}
                  />
                  <span>{sec}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create Course'}
          </button>
        </form>
      </div>

      {/* COURSE LIST */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Existing Courses</h2>
        {loading ? <LoadingSpinner /> : (
          <table className="min-w-full">
            <thead className="table-header">
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Year</th>
                <th>Type</th>
                <th>Hours</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c._id}>
                  <td>{c.courseCode}</td>
                  <td>{c.courseName}</td>
                  <td>{c.year}</td>
                  <td className="capitalize">{c.courseType}</td>
                  <td>{c.weeklyHours}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CourseForm;
