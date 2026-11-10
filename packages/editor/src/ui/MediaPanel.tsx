import type { MediaAsset } from "../model";

export function MediaPanel({
  media,
  busy,
  onUpload,
  onRemove,
}: {
  media: MediaAsset[];
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: (path: string) => void;
}) {
  return (
    <section className="pane pane-media" aria-label="Media">
      <header className="pane-head">
        <h2>Media</h2>
        <p>Images are scaled on this device before they are sent to the backend. The long edge stops at 1600 pixels.</p>
      </header>
      <label className="btn btn-wide file-btn">
        Upload image
        <input
          data-testid="media-input"
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(file);
          }}
        />
      </label>
      <ul className="media-list" data-testid="media-library">
        {media.length === 0 ? <li className="empty">No files stored.</li> : null}
        {media.map((item) => (
          <li key={item.path} data-testid={`media-${item.name}`}>
            {item.dataUrl.startsWith("data:image/") ? <img src={item.dataUrl} alt="" /> : null}
            <div>
              <strong>{item.name}</strong>
              <p className="hint">
                {item.scaled
                  ? `Scaled from ${item.originalWidth}×${item.originalHeight} to ${item.width}×${item.height}.`
                  : item.width
                    ? `Kept at ${item.width}×${item.height}.`
                    : "Stored as uploaded."}
              </p>
              <button type="button" className="btn" onClick={() => onRemove(item.path)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
