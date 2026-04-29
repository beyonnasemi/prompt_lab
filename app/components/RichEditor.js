'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { useCallback, useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote, Code2,
  Link as LinkIcon, Image as ImageIcon, Undo2, Redo2,
  Minus, Table as TableIcon, Rows3, Columns3, Trash2,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { uploadInlineImageAction } from '@/app/actions/upload';
import { cn } from '@/lib/utils';

/**
 * Rich text editor based on TipTap.
 *
 * Paste behavior:
 *   - Plain text → inserted as paragraph, preserves line breaks
 *   - HTML (Word, Google Docs, ChatGPT, web) → preserves bold, lists, headings, links
 *   - Images (clipboard or drag-drop) → uploaded to Supabase Storage, inserted as <img>
 *
 * `value` / `onChange`: HTML string
 */
export default function RichEditor({
  value = '',
  onChange,
  placeholder = '내용을 입력하거나 붙여넣으세요...',
  minHeight = 160,
  toolbar = 'full', // 'full' | 'compact'
  className,
}) {
  const lastExternalValue = useRef(value);

  const editor = useEditor({
    extensions: [
      // StarterKit 3.x already ships Link, Underline, BulletList, OrderedList, ListItem.
      // Configure them here so we don't add duplicates.
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: 'rich-code-block' } },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'rich-image' },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'rich-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'rich-editor-content prose-prompt focus:outline-none',
          className,
        ),
        style: `min-height:${minHeight}px`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type?.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadAndInsertImage(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFiles = Array.from(files).filter((f) =>
          f.type?.startsWith('image/'),
        );
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        imageFiles.forEach((file) => uploadAndInsertImage(file));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastExternalValue.current = html;
      onChange?.(html);
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g., when switching prompts)
  useEffect(() => {
    if (!editor) return;
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    editor.commands.setContent(value || '', false);
  }, [value, editor]);

  const uploadAndInsertImage = useCallback(
    async (file) => {
      if (!editor) return;

      // Optimistic placeholder
      const placeholderId = `upl-${Date.now()}`;
      editor
        .chain()
        .focus()
        .insertContent(
          `<p data-uploading="${placeholderId}" style="color:#94a3b8;font-style:italic;">이미지 업로드 중…</p>`,
        )
        .run();

      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadInlineImageAction(fd);

      // Remove placeholder
      const { state } = editor;
      const tr = state.tr;
      state.doc.descendants((node, pos) => {
        if (
          node.type.name === 'paragraph' &&
          node.attrs?.['data-uploading'] === placeholderId
        ) {
          tr.delete(pos, pos + node.nodeSize);
          return false;
        }
      });
      if (tr.docChanged) editor.view.dispatch(tr);

      // Simpler: replace by locating the text content
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          state.doc.descendants((node, pos) => {
            if (
              node.type.name === 'paragraph' &&
              node.textContent === '이미지 업로드 중…'
            ) {
              tr.delete(pos, pos + node.nodeSize);
            }
          });
          return true;
        })
        .run();

      if (res.success && res.url) {
        editor.chain().focus().setImage({ src: res.url }).run();
      } else {
        alert('이미지 업로드 실패: ' + (res.error || '알 수 없는 오류'));
      }
    },
    [editor],
  );

  const handleImageButton = useCallback(() => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) uploadAndInsertImage(f);
    };
    input.click();
  }, [editor, uploadAndInsertImage]);

  const handleLinkButton = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('링크 URL', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-xl border border-border bg-muted/50',
          className,
        )}
        style={{ minHeight }}
      />
    );
  }

  const compact = toolbar === 'compact';

  return (
    <div className="rich-editor overflow-hidden rounded-xl border border-border bg-card transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="굵게 (Ctrl+B)"
        >
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="기울임 (Ctrl+I)"
        >
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="밑줄 (Ctrl+U)"
        >
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="취소선"
        >
          <Strikethrough size={14} />
        </ToolbarBtn>

        <Divider />

        {!compact && (
          <>
            <ToolbarBtn
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive('heading', { level: 2 })}
              title="제목 2"
            >
              <Heading2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive('heading', { level: 3 })}
              title="제목 3"
            >
              <Heading3 size={14} />
            </ToolbarBtn>
            <Divider />
          </>
        )}

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="글머리 기호"
        >
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="번호 매기기"
        >
          <ListOrdered size={14} />
        </ToolbarBtn>

        {!compact && (
          <>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="인용"
            >
              <Quote size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
              title="코드 블록"
            >
              <Code2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="구분선"
            >
              <Minus size={14} />
            </ToolbarBtn>
          </>
        )}

        <Divider />

        <ToolbarBtn onClick={handleLinkButton} active={editor.isActive('link')} title="링크">
          <LinkIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={handleImageButton} title="이미지 삽입">
          <ImageIcon size={14} />
        </ToolbarBtn>
        {!compact && (
          <ToolbarBtn
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            active={editor.isActive('table')}
            title="표 삽입"
          >
            <TableIcon size={14} />
          </ToolbarBtn>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="다시 실행 (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </ToolbarBtn>
        </div>
      </div>

      {/* Contextual table toolbar — only visible when cursor is in a table */}
      {editor.isActive('table') && !compact && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-brand-500/5 px-1.5 py-1">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            <TableIcon size={11} /> 표 편집
          </span>
          <ToolbarBtn
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="왼쪽에 열 추가"
          >
            <ArrowLeft size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="오른쪽에 열 추가"
          >
            <ArrowRight size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="현재 열 삭제"
          >
            <Columns3 size={13} />
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="위쪽에 행 추가"
          >
            <ArrowUp size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="아래쪽에 행 추가"
          >
            <ArrowDown size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="현재 행 삭제"
          >
            <Rows3 size={13} />
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            title="첫 행 헤더 토글"
          >
            <span className="text-[10px] font-bold">H</span>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
            title="셀 병합/분할"
          >
            <span className="text-[10px] font-bold">⊞</span>
          </ToolbarBtn>
          <div className="ml-auto">
            <ToolbarBtn
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="표 삭제"
            >
              <Trash2 size={13} className="text-red-500" />
            </ToolbarBtn>
          </div>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition',
        active && 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
        !active && !disabled && 'hover:bg-muted hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;
}
