import UploadForm from '../components/UploadForm.jsx'

export default function Upload() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="page-title mb-0">Upload Video</h1>
        <p className="text-neutral-400 mt-2">Share your content with the StreamNest community</p>
      </div>
      <UploadForm onUploaded={() => alert('Uploaded! You may need to refresh the Home or Studio page.')} />
    </div>
  )
}
