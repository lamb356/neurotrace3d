import type { SWCNode, SWCParseResult, ParseWarning } from "@neurotrace/swc-parser";

// ---- Token types ----

const enum TokenType {
  LPAREN,
  RPAREN,
  LBRACKET,
  RBRACKET,
  PIPE,
  NUMBER,
  STRING,
  WORD,
  EOF,
}

interface Token {
  type: TokenType;
  value: string;
  num: number; // only meaningful for NUMBER
}

// ---- Tokenizer ----

class Tokenizer {
  private pos = 0;
  private peeked: Token | null = null;

  constructor(private input: string) {}

  peek(): Token {
    if (!this.peeked) this.peeked = this.readToken();
    return this.peeked;
  }

  next(): Token {
    if (this.peeked) {
      const t = this.peeked;
      this.peeked = null;
      return t;
    }
    return this.readToken();
  }

  private readToken(): Token {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: "", num: 0 };
    }

    const ch = this.input[this.pos];

    if (ch === "(") {
      this.pos++;
      return { type: TokenType.LPAREN, value: "(", num: 0 };
    }
    if (ch === ")") {
      this.pos++;
      return { type: TokenType.RPAREN, value: ")", num: 0 };
    }
    if (ch === "[") {
      this.pos++;
      return { type: TokenType.LBRACKET, value: "[", num: 0 };
    }
    if (ch === "]") {
      this.pos++;
      return { type: TokenType.RBRACKET, value: "]", num: 0 };
    }
    if (ch === "|") {
      this.pos++;
      return { type: TokenType.PIPE, value: "|", num: 0 };
    }

    // Quoted string
    if (ch === '"') {
      return this.readString();
    }

    // Number (starts with digit, '.', or '-' followed by digit or '.')
    if (this.isNumberStart(ch)) {
      return this.readNumber();
    }

    // Word (identifier)
    if (this.isWordChar(ch)) {
      return this.readWord();
    }

    // Skip unknown character
    this.pos++;
    return this.readToken();
  }

  private skipWhitespaceAndComments() {
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === ",") {
        this.pos++;
      } else if (ch === ";") {
        // Comment: skip to end of line
        while (this.pos < this.input.length && this.input[this.pos] !== "\n") {
          this.pos++;
        }
      } else {
        break;
      }
    }
  }

  private readString(): Token {
    this.pos++; // skip opening "
    let value = "";
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      value += this.input[this.pos];
      this.pos++;
    }
    if (this.pos < this.input.length) this.pos++; // skip closing "
    return { type: TokenType.STRING, value, num: 0 };
  }

  private readNumber(): Token {
    const start = this.pos;
    if (this.input[this.pos] === "-") this.pos++;
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) this.pos++;
    if (this.pos < this.input.length && this.input[this.pos] === ".") {
      this.pos++;
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) this.pos++;
    }
    // Scientific notation
    if (this.pos < this.input.length && (this.input[this.pos] === "e" || this.input[this.pos] === "E")) {
      this.pos++;
      if (this.pos < this.input.length && (this.input[this.pos] === "+" || this.input[this.pos] === "-")) {
        this.pos++;
      }
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) this.pos++;
    }
    const value = this.input.slice(start, this.pos);
    return { type: TokenType.NUMBER, value, num: parseFloat(value) };
  }

  private readWord(): Token {
    const start = this.pos;
    while (this.pos < this.input.length && this.isWordChar(this.input[this.pos])) {
      this.pos++;
    }
    return { type: TokenType.WORD, value: this.input.slice(start, this.pos), num: 0 };
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isNumberStart(ch: string): boolean {
    if (this.isDigit(ch) || ch === ".") return true;
    if (ch === "-") {
      const next = this.pos + 1 < this.input.length ? this.input[this.pos + 1] : "";
      return this.isDigit(next) || next === ".";
    }
    return false;
  }

  private isWordChar(ch: string): boolean {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "_"
    );
  }
}

// ---- Block type mapping ----

const NEURITE_TYPES: Record<string, number> = {
  cellbody: 1,
  soma: 1,
  axon: 2,
  dendrite: 3,
  apical: 4,
};

const SKIP_DIRECTIVES = new Set([
  "color", "colour", "font", "name", "imagecoords", "resolution",
  "thumbnail", "description", "set", "filetype",
]);

const MARKER_WORDS = new Set([
  "cross", "dot", "circle", "filledcircle", "opencircle",
  "triup", "tridown", "square", "diamond", "star", "splat",
  "flower", "snowflake", "asterisk", "plus", "x",
]);

const END_TAGS = new Set([
  "normal", "incomplete", "generated", "high", "low",
  "midpoint", "origin",
]);

// ---- Parser ----

/**
 * Parse Neurolucida .asc format into SWCParseResult.
 *
 * Grammar (simplified):
 *   file    → block*
 *   block   → '(' header? section ')'
 *   section → (point | branch | marker | directive | endtag)*
 *   point   → '(' NUMBER NUMBER NUMBER NUMBER? ')'
 *   branch  → '(' section ('|' section)* ')'
 */
export function parseNeurolucidaAsc(content: string): SWCParseResult {
  const tokenizer = new Tokenizer(content);
  const nodes: SWCNode[] = [];
  const warnings: ParseWarning[] = [];
  let nextId = 1;

  function addNode(type: number, x: number, y: number, z: number, diameter: number, parentId: number): number {
    const id = nextId++;
    nodes.push({ id, type, x, y, z, radius: diameter / 2, parentId });
    return id;
  }

  // Parse all top-level blocks
  function parseFile() {
    while (tokenizer.peek().type !== TokenType.EOF) {
      if (tokenizer.peek().type === TokenType.LPAREN) {
        parseTopBlock();
      } else {
        // Skip stray tokens at top level
        tokenizer.next();
      }
    }
  }

  // Parse a top-level block: ( header content )
  function parseTopBlock() {
    tokenizer.next(); // consume LPAREN

    // Detect block type
    let blockType = 0; // default: undefined

    // Check for inner header: ( Type ) or "CellBody" string
    const tok = tokenizer.peek();

    if (tok.type === TokenType.STRING) {
      // "CellBody" as string literal (old format)
      const lower = tok.value.toLowerCase();
      if (lower in NEURITE_TYPES) {
        blockType = NEURITE_TYPES[lower];
        tokenizer.next();
      }
    } else if (tok.type === TokenType.LPAREN) {
      // Could be inner header like (Dendrite) or (Color ...)
      const headerType = tryParseHeader();
      if (headerType !== null) {
        blockType = headerType;
      }
    } else if (tok.type === TokenType.WORD) {
      const lower = tok.value.toLowerCase();
      if (lower in NEURITE_TYPES) {
        blockType = NEURITE_TYPES[lower];
        tokenizer.next();
      } else if (SKIP_DIRECTIVES.has(lower)) {
        // Skip entire block (e.g., top-level (Set ...) or (ImageCoords ...))
        skipBalancedContent();
        return;
      }
    }

    // If this is a soma/CellBody block, parse soma points
    if (blockType === 1) {
      parseSomaBlock();
      return;
    }

    // Parse neurite section
    if (blockType >= 2) {
      parseSection(-1, blockType);
    } else {
      // Unknown block type — try to parse as neurite anyway
      parseSection(-1, 0);
    }

    // Consume trailing RPAREN
    if (tokenizer.peek().type === TokenType.RPAREN) {
      tokenizer.next();
    }
  }

  // Try parsing ( TypeWord ) or ( TypeWord ... ) header
  // Returns type code or null if not a neurite header
  function tryParseHeader(): number | null {
    // Save position to revert if needed
    // We'll consume ( and peek at next
    tokenizer.next(); // consume LPAREN

    const tok = tokenizer.peek();
    if (tok.type === TokenType.WORD) {
      const lower = tok.value.toLowerCase();
      if (lower in NEURITE_TYPES) {
        const typeCode = NEURITE_TYPES[lower];
        tokenizer.next(); // consume type word

        // Skip remaining header content until )
        skipUntilRparen();
        return typeCode;
      }
      if (SKIP_DIRECTIVES.has(lower)) {
        // This is a directive like (Color ...), skip it
        tokenizer.next(); // consume directive word
        skipUntilRparen();
        return null;
      }
    }

    // Not a header — this might be the first point.
    // But since we consumed LPAREN, we need to handle it.
    // If it looks like a coordinate (starts with NUMBER), handle as a point would.
    // Push back by returning null — caller will see no header type.
    if (tok.type === TokenType.NUMBER) {
      // This is actually a coordinate point (x y z d), parse it as such
      // We already consumed the LPAREN, so parse the numbers and close paren
      const x = tokenizer.next().num;
      const y = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 0;
      const z = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 0;
      const d = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 1;
      if (tokenizer.peek().type === TokenType.RPAREN) tokenizer.next();
      // We consumed a coordinate — this is unusual at header position
      // Add it as an undefined-type node
      addNode(0, x, y, z, d, -1);
    } else {
      // Skip whatever this is
      skipUntilRparen();
    }

    return null;
  }

  // Parse CellBody block — soma points are independent (contour, not tree)
  function parseSomaBlock() {
    while (tokenizer.peek().type !== TokenType.RPAREN && tokenizer.peek().type !== TokenType.EOF) {
      const tok = tokenizer.peek();

      if (tok.type === TokenType.LPAREN) {
        tokenizer.next(); // consume LPAREN

        const inner = tokenizer.peek();
        if (inner.type === TokenType.NUMBER) {
          // Coordinate point
          const x = tokenizer.next().num;
          const y = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 0;
          const z = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 0;
          const d = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 1;
          // Skip any trailing words in the point (e.g., annotation)
          while (tokenizer.peek().type === TokenType.WORD) tokenizer.next();
          if (tokenizer.peek().type === TokenType.RPAREN) tokenizer.next();
          addNode(1, x, y, z, d, -1);
        } else if (inner.type === TokenType.WORD) {
          // Directive like (Color ...) or (CellBody) marker
          tokenizer.next(); // consume word
          skipUntilRparen();
        } else {
          skipUntilRparen();
        }
      } else {
        // Skip stray tokens (WORD, STRING, etc.)
        tokenizer.next();
      }
    }

    // Consume closing RPAREN
    if (tokenizer.peek().type === TokenType.RPAREN) tokenizer.next();
  }

  // Parse a section: sequence of points and branches
  // Returns the last node ID in the section (for parent linking)
  function parseSection(parentId: number, currentType: number): number {
    let lastId = parentId;

    while (true) {
      const tok = tokenizer.peek();

      if (tok.type === TokenType.EOF || tok.type === TokenType.RPAREN || tok.type === TokenType.PIPE) {
        break;
      }

      if (tok.type === TokenType.LPAREN) {
        tokenizer.next(); // consume LPAREN

        const inner = tokenizer.peek();

        if (inner.type === TokenType.NUMBER) {
          // Coordinate point
          const x = tokenizer.next().num;
          const y = inner.type === TokenType.NUMBER ? tokenizer.next().num : 0;
          const z = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 0;
          const d = tokenizer.peek().type === TokenType.NUMBER ? tokenizer.next().num : 1;
          // Skip any trailing words
          while (tokenizer.peek().type === TokenType.WORD) tokenizer.next();
          if (tokenizer.peek().type === TokenType.RPAREN) tokenizer.next();
          lastId = addNode(currentType, x, y, z, d, lastId);
        } else if (inner.type === TokenType.LPAREN || inner.type === TokenType.PIPE) {
          // This is a branch block: ( section | section | ... )
          // Parse first child section
          parseSection(lastId, currentType);

          // Parse siblings separated by |
          while (tokenizer.peek().type === TokenType.PIPE) {
            tokenizer.next(); // consume PIPE

            // Empty sibling (| immediately followed by ))
            if (tokenizer.peek().type === TokenType.RPAREN) {
              break;
            }

            parseSection(lastId, currentType);
          }

          // Consume closing RPAREN of branch block
          if (tokenizer.peek().type === TokenType.RPAREN) tokenizer.next();
        } else if (inner.type === TokenType.WORD) {
          const lower = inner.value.toLowerCase();
          if (SKIP_DIRECTIVES.has(lower) || MARKER_WORDS.has(lower)) {
            // Skip directive/marker: consume word + balanced content until )
            tokenizer.next();
            skipUntilRparen();
          } else if (lower in NEURITE_TYPES) {
            // Nested neurite header (rare but possible)
            tokenizer.next();
            skipUntilRparen();
          } else {
            // Unknown inner block — skip
            tokenizer.next();
            skipUntilRparen();
          }
        } else {
          // Unknown content — skip to matching )
          skipUntilRparen();
        }
      } else if (tok.type === TokenType.LBRACKET) {
        // Spine block [...] — skip entirely
        skipSpineBlock();
      } else if (tok.type === TokenType.WORD) {
        const lower = tok.value.toLowerCase();
        if (END_TAGS.has(lower)) {
          tokenizer.next(); // consume end tag
        } else if (SKIP_DIRECTIVES.has(lower) || MARKER_WORDS.has(lower)) {
          tokenizer.next(); // consume
        } else {
          tokenizer.next(); // skip unknown word
        }
      } else if (tok.type === TokenType.STRING) {
        tokenizer.next(); // skip string annotations
      } else {
        tokenizer.next(); // skip anything else
      }
    }

    return lastId;
  }

  // Skip tokens until matching RPAREN (balanced)
  function skipUntilRparen() {
    let depth = 0;
    while (true) {
      const tok = tokenizer.peek();
      if (tok.type === TokenType.EOF) break;
      if (tok.type === TokenType.LPAREN) depth++;
      if (tok.type === TokenType.RPAREN) {
        if (depth === 0) {
          tokenizer.next(); // consume the closing )
          return;
        }
        depth--;
      }
      tokenizer.next();
    }
  }

  // Skip [...] spine block
  function skipSpineBlock() {
    tokenizer.next(); // consume [
    let depth = 1;
    while (depth > 0) {
      const tok = tokenizer.next();
      if (tok.type === TokenType.EOF) break;
      if (tok.type === TokenType.LBRACKET) depth++;
      if (tok.type === TokenType.RBRACKET) depth--;
    }
  }

  // Skip balanced content (handles nested parens and brackets)
  function skipBalancedContent() {
    let depth = 0; // we're already inside the outer (
    while (true) {
      const tok = tokenizer.peek();
      if (tok.type === TokenType.EOF) break;
      if (tok.type === TokenType.LPAREN) depth++;
      if (tok.type === TokenType.RPAREN) {
        if (depth === 0) {
          tokenizer.next();
          return;
        }
        depth--;
      }
      tokenizer.next();
    }
  }

  // ---- Run parser ----
  parseFile();

  // ---- Build result ----
  const nodeMap = new Map<number, SWCNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const roots: number[] = [];
  const childIndex = new Map<number, number[]>();

  for (const node of nodes) {
    if (node.parentId === -1) {
      roots.push(node.id);
    } else {
      const children = childIndex.get(node.parentId);
      if (children) {
        children.push(node.id);
      } else {
        childIndex.set(node.parentId, [node.id]);
      }
    }
  }

  // Warnings
  if (roots.length === 0) {
    warnings.push({ type: "NO_ROOT", message: "No root nodes found" });
  }

  let hasSoma = false;
  for (const node of nodes) {
    if (node.type === 1) {
      hasSoma = true;
      break;
    }
  }
  if (!hasSoma) {
    warnings.push({ type: "MISSING_SOMA", message: "No soma nodes (type 1) found" });
  }

  return {
    nodes: nodeMap,
    roots,
    childIndex,
    comments: [],
    metadata: { originalSource: "Neurolucida ASC" },
    warnings,
  };
}
