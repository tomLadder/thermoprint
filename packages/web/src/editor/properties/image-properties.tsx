import type { EditorElement, ImageProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";

export function ImageProperties({ element }: { element: EditorElement }) {
  const props = element.props as ImageProps;
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const replaceImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pushHistory();
        const img = new window.Image();
        img.src = reader.result as string;
        img.onload = () => {
          updateElementProps(element.id, {
            src: reader.result as string,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        };
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Image</label>
        <div className="mt-1">
          <img src={props.src} alt="" className="w-full h-20 object-contain bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700" />
        </div>
        <button onClick={replaceImage} className="mt-2 w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          Replace Image
        </button>
      </div>
      <div className="text-sm text-gray-400">Original: {props.naturalWidth} x {props.naturalHeight} px</div>
    </div>
  );
}
