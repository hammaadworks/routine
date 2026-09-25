/**
 * Comprehensive WebMCP Polyfill & Declarative DOM Sync
 * Ensures WebMCP (Web Model Context Protocol) is available imperatively
 * via document.modelContext / navigator.modelContext and declaratively
 * in the DOM with `toolname` and `tooldescription` attributes.
 */

export class WebModelContext {
  private tools = new Map<string, { tool: any; element?: HTMLElement }>();

  constructor() {
    this.ensureDeclarativeContainer();
  }

  private ensureDeclarativeContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    let container = document.getElementById('webmcp-declarative-registry');
    if (!container) {
      container = document.createElement('div');
      container.id = 'webmcp-declarative-registry';
      container.setAttribute('aria-hidden', 'true');
      container.style.display = 'none';
      if (document.body) {
        document.body.appendChild(container);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (!document.getElementById('webmcp-declarative-registry')) {
            document.body.appendChild(container!);
          }
        });
      }
    }
    return container;
  }

  registerTool(tool: any, options?: { signal?: AbortSignal }): void {
    if (!tool || !tool.name) return;

    // Handle AbortSignal for auto-unregistration (used by use-webmcp-tool on unmount)
    if (options?.signal) {
      if (options.signal.aborted) return;
      options.signal.addEventListener('abort', () => {
        this.unregisterTool(tool.name);
      });
    }

    // Unregister existing tool with same name if present
    if (this.tools.has(tool.name)) {
      this.unregisterTool(tool.name);
    }

    // Create declarative DOM element representation
    let element: HTMLElement | undefined;
    if (typeof document !== 'undefined') {
      const container = this.ensureDeclarativeContainer();
      if (container) {
        const form = document.createElement('form');
        form.id = `webmcp-tool-${tool.name}`;
        form.setAttribute('toolname', tool.name);
        form.setAttribute('tooldescription', tool.description || '');
        if (tool.inputSchema) {
          form.setAttribute('data-input-schema', JSON.stringify(tool.inputSchema));
        }
        form.style.display = 'none';

        // Add hidden input & button for declarative scanners
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'inputData';
        form.appendChild(input);

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.textContent = tool.name;
        form.appendChild(submitBtn);

        // Bind form submit event to execute tool
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const formData = new FormData(form);
            const rawVal = formData.get('inputData');
            const args = rawVal ? JSON.parse(rawVal as string) : {};
            await this.executeTool(tool.name, args);
          } catch (err) {
            console.error(`Declarative execution error for ${tool.name}:`, err);
          }
        });

        container.appendChild(form);
        element = form;
      }
    }

    this.tools.set(tool.name, { tool, element });
  }

  unregisterTool(toolName: string): boolean {
    const record = this.tools.get(toolName);
    if (!record) return false;

    if (record.element && record.element.parentNode) {
      record.element.parentNode.removeChild(record.element);
    }

    this.tools.delete(toolName);
    return true;
  }

  getTools(): any[] {
    return Array.from(this.tools.values()).map(r => r.tool);
  }

  listTools(): any[] {
    return this.getTools();
  }

  *list(): Generator<any> {
    for (const { tool } of this.tools.values()) {
      const { execute, ...info } = tool;
      yield info;
    }
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    const record = this.tools.get(toolName);
    if (!record) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${toolName}` }],
        isError: true
      };
    }

    try {
      const result = await record.tool.execute(args);
      if (result && typeof result === 'object' && Array.isArray(result.content)) {
        return result;
      }
      if (typeof result === 'string') {
        return { content: [{ type: 'text', text: result }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result ?? {}) }] };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error?.message || String(error) }],
        isError: true
      };
    }
  }
}

/**
 * Automatically initializes and attaches WebModelContext to global objects
 */
export function initWebMCPPolyfill(): WebModelContext {
  if (typeof window === 'undefined') {
    return new WebModelContext();
  }

  const existing = (document as any).modelContext || (navigator as any).modelContext || (window as any).modelContext;
  if (existing && typeof existing.registerTool === 'function') {
    return existing;
  }

  const instance = new WebModelContext();

  try {
    Object.defineProperty(document, 'modelContext', {
      value: instance,
      writable: true,
      configurable: true
    });
  } catch {
    (document as any).modelContext = instance;
  }

  try {
    Object.defineProperty(navigator, 'modelContext', {
      value: instance,
      writable: true,
      configurable: true
    });
  } catch {
    (navigator as any).modelContext = instance;
  }

  try {
    (window as any).modelContext = instance;
  } catch {}

  return instance;
}

// Auto-run polyfill on import
initWebMCPPolyfill();
