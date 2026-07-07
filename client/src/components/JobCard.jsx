import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function JobCard({ job, onDelete }) {
  return (
    <div className="job-card">
      <div className="job-card-header">
        <h3>
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            {job.title}
          </a>
        </h3>
        <span className={`badge badge-${job.source}`}>{job.source}</span>
      </div>

      <div className="job-card-meta">
        <span>{job.company}</span>
        <span>&middot;</span>
        <span>{job.location}</span>
        {job.postedAt && (
          <>
            <span>&middot;</span>
            <span>{formatDate(job.postedAt)}</span>
          </>
        )}
      </div>

      {job.tags?.length > 0 && (
        <div className="job-card-tags">
          {job.tags.slice(0, 6).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {job.description && <p className="job-card-desc">{job.description.slice(0, 220)}...</p>}

      <div className="job-card-footer">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-link">
          View posting →
        </a>
        <button className="btn-delete" onClick={() => onDelete(job._id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
