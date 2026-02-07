// import React, { useState, useEffect } from 'react';
// import { adminAPI } from '../../services/api';
// import LoadingSpinner from '../common/LoadingSpinner';
// import ErrorMessage from '../common/ErrorMessage';

// const FacultyForm = () => {
//   const [faculty, setFaculty] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [formData, setFormData] = useState({
//     facultyId: '',
//     name: '',
//     email: '',
//     department: '',
//     designation: 'Assistant Professor',
//     contactNumber: '',
//   });

//   useEffect(() => {
//     fetchFaculty();
//   }, []);

//   const fetchFaculty = async () => {
//     try {
//       setLoading(true);
//       const response = await adminAPI.getFaculty();
//       setFaculty(response.data.data);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to fetch faculty');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       setLoading(true);
//       await adminAPI.createFaculty(formData);
//       await fetchFaculty();
//       setFormData({
//         facultyId: '',
//         name: '',
//         email: '',
//         department: '',
//         designation: 'Assistant Professor',
//         contactNumber: '',
//       });
//       alert('Faculty created successfully!');
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to create faculty');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="card">
//         <h2 className="text-2xl font-bold mb-6">Add Faculty Member</h2>
//         <ErrorMessage message={error} onClose={() => setError('')} />
        
//         <form onSubmit={handleSubmit} className="space-y-4 mt-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="label">Clerk User ID</label>
//               <input type="text" className="input-field" value={formData.clerkUserId}
//                 onChange={(e) => setFormData({ ...formData, clerkUserId: e.target.value })} required />
//             </div>
//             <div>
//               <label className="label">Faculty ID</label>
//               <input type="text" className="input-field" value={formData.facultyId}
//                 onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })} required />
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="label">Name</label>
//               <input type="text" className="input-field" value={formData.name}
//                 onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
//             </div>
//             <div>
//               <label className="label">Email</label>
//               <input type="email" className="input-field" value={formData.email}
//                 onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="label">Department</label>
//               <input type="text" className="input-field" value={formData.department}
//                 onChange={(e) => setFormData({ ...formData, department: e.target.value })} required />
//             </div>
//             <div>
//               <label className="label">Designation</label>
//               <select className="input-field" value={formData.designation}
//                 onChange={(e) => setFormData({ ...formData, designation: e.target.value })}>
//                 <option value="Professor">Professor</option>
//                 <option value="Associate Professor">Associate Professor</option>
//                 <option value="Assistant Professor">Assistant Professor</option>
//                 <option value="Lecturer">Lecturer</option>
//               </select>
//             </div>
//           </div>
//           <button type="submit" className="btn-primary" disabled={loading}>
//             {loading ? <LoadingSpinner size="sm" /> : 'Add Faculty'}
//           </button>
//         </form>
//       </div>

//       <div className="card">
//         <h2 className="text-2xl font-bold mb-4">Faculty List</h2>
//         {loading ? <LoadingSpinner /> : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="table-header">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {faculty.map((f) => (
//                   <tr key={f._id}>
//                     <td className="table-cell">{f.facultyId}</td>
//                     <td className="table-cell">{f.name}</td>
//                     <td className="table-cell">{f.email}</td>
//                     <td className="table-cell">{f.department}</td>
//                     <td className="table-cell">{f.designation}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default FacultyForm;


import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const FacultyForm = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    facultyId: '',
    name: '',
    email: '',
    department: '',
    designation: 'Assistant Professor',
    contactNumber: '',
  });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getFaculty();
      setFaculty(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch faculty');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      await adminAPI.createFaculty(formData);
      await fetchFaculty();

      setFormData({
        facultyId: '',
        name: '',
        email: '',
        department: '',
        designation: 'Assistant Professor',
        contactNumber: '',
      });

      alert('Faculty created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create faculty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ADD FACULTY */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Add Faculty Profile</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Faculty ID</label>
              <input
                type="text"
                className="input-field"
                value={formData.facultyId}
                onChange={(e) =>
                  setFormData({ ...formData, facultyId: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="label">Department</label>
              <input
                type="text"
                className="input-field"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Designation</label>
              <select
                className="input-field"
                value={formData.designation}
                onChange={(e) =>
                  setFormData({ ...formData, designation: e.target.value })
                }
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
              </select>
            </div>

            <div>
              <label className="label">Contact Number</label>
              <input
                type="text"
                className="input-field"
                value={formData.contactNumber}
                onChange={(e) =>
                  setFormData({ ...formData, contactNumber: e.target.value })
                }
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Add Faculty'}
          </button>
        </form>
      </div>

      {/* FACULTY LIST */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Faculty List</h2>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Faculty ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Designation
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {faculty.map((f) => (
                  <tr key={f._id}>
                    <td className="table-cell">{f.facultyId}</td>
                    <td className="table-cell">{f.name}</td>
                    <td className="table-cell">{f.email}</td>
                    <td className="table-cell">{f.department}</td>
                    <td className="table-cell">{f.designation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyForm;
