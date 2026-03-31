import { describe, it, expect } from "vitest";
import { sanitizeSvgPaths } from "../sanitize_svg";

describe("sanitizeSvgPaths", () => {
	describe("empty / falsy input", () => {
		it("returns empty array for empty string", () => {
			expect(sanitizeSvgPaths("")).toEqual([]);
		});

		it("returns empty array for undefined-ish input", () => {
			expect(sanitizeSvgPaths(null as unknown as string)).toEqual([]);
			expect(sanitizeSvgPaths(undefined as unknown as string)).toEqual([]);
		});
	});

	describe("allowed tags", () => {
		it("parses a <path> element", () => {
			const result = sanitizeSvgPaths('<path d="M0 0L10 10"/>');
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("path");
			expect(result[0].props.d).toBe("M0 0L10 10");
		});

		it("parses a <circle> element", () => {
			const result = sanitizeSvgPaths('<circle cx="5" cy="5" r="3"/>');
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("circle");
			expect(result[0].props.cx).toBe("5");
			expect(result[0].props.cy).toBe("5");
			expect(result[0].props.r).toBe("3");
		});

		it("parses a <rect> element", () => {
			const result = sanitizeSvgPaths('<rect x="0" y="0" width="10" height="10"/>');
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("rect");
		});

		it("parses <line>, <polyline>, <polygon>, <ellipse>", () => {
			const markup = [
				'<line x1="0" y1="0" x2="10" y2="10"/>',
				'<polyline points="0,0 10,10 20,0"/>',
				'<polygon points="0,0 10,10 20,0"/>',
				'<ellipse cx="5" cy="5" rx="3" ry="2"/>',
			].join("");
			const result = sanitizeSvgPaths(markup);
			expect(result).toHaveLength(4);
			expect(result.map((r) => r.type)).toEqual(["line", "polyline", "polygon", "ellipse"]);
		});

		it("parses multiple elements", () => {
			const result = sanitizeSvgPaths('<path d="M1"/><path d="M2"/>');
			expect(result).toHaveLength(2);
		});
	});

	describe("nested <g> elements", () => {
		it("preserves children of <g>", () => {
			const result = sanitizeSvgPaths('<g><path d="M0 0"/><circle cx="1" cy="1" r="1"/></g>');
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("g");
			expect(result[0].props.children).toHaveLength(2);
		});

		it("handles deeply nested <g> elements", () => {
			const result = sanitizeSvgPaths('<g><g><path d="M0 0"/></g></g>');
			expect(result).toHaveLength(1);
			const innerG = result[0].props.children[0];
			expect(innerG.type).toBe("g");
			expect(innerG.props.children).toHaveLength(1);
		});
	});

	describe("disallowed tags (XSS prevention)", () => {
		it("strips <script> tags", () => {
			const result = sanitizeSvgPaths('<script>alert("xss")</script><path d="M0 0"/>');
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("path");
		});

		it("strips <foreignObject> tags", () => {
			const result = sanitizeSvgPaths('<foreignObject><body>hack</body></foreignObject>');
			expect(result).toHaveLength(0);
		});

		it("strips <iframe> tags", () => {
			const result = sanitizeSvgPaths('<iframe src="evil.com"/>');
			expect(result).toHaveLength(0);
		});

		it("strips <image> tags (not in allowed set)", () => {
			const result = sanitizeSvgPaths('<image href="evil.png"/>');
			expect(result).toHaveLength(0);
		});

		it("strips <a> tags", () => {
			const result = sanitizeSvgPaths('<a href="evil.com"><path d="M0"/></a>');
			expect(result).toHaveLength(0);
		});

		it("filters disallowed children inside <g>", () => {
			const result = sanitizeSvgPaths('<g><script>alert(1)</script><path d="M0"/></g>');
			expect(result).toHaveLength(1);
			// g should only have the path child
			expect(result[0].props.children).toHaveLength(1);
			expect(result[0].props.children[0].type).toBe("path");
		});
	});

	describe("attribute filtering", () => {
		it("keeps allowed attributes", () => {
			const result = sanitizeSvgPaths('<path d="M0" fill="red" stroke="blue" stroke-width="2"/>');
			expect(result[0].props.d).toBe("M0");
			expect(result[0].props.fill).toBe("red");
			expect(result[0].props.stroke).toBe("blue");
			expect(result[0].props.strokeWidth).toBe("2");
		});

		it("strips event handler attributes", () => {
			const result = sanitizeSvgPaths('<path d="M0" onclick="alert(1)" onload="evil()"/>');
			expect(result[0].props.d).toBe("M0");
			expect(result[0].props.onclick).toBeUndefined();
			expect(result[0].props.onload).toBeUndefined();
		});

		it("strips style attribute", () => {
			const result = sanitizeSvgPaths('<path d="M0" style="background:url(evil)"/>');
			expect(result[0].props.style).toBeUndefined();
		});

		it("strips class and id attributes", () => {
			const result = sanitizeSvgPaths('<path d="M0" class="evil" id="target"/>');
			expect(result[0].props.class).toBeUndefined();
			expect(result[0].props.id).toBeUndefined();
		});
	});

	describe("attribute name mapping", () => {
		it("converts fill-rule to fillRule", () => {
			const result = sanitizeSvgPaths('<path d="M0" fill-rule="evenodd"/>');
			expect(result[0].props.fillRule).toBe("evenodd");
			expect(result[0].props["fill-rule"]).toBeUndefined();
		});

		it("converts clip-rule to clipRule", () => {
			const result = sanitizeSvgPaths('<path d="M0" clip-rule="nonzero"/>');
			expect(result[0].props.clipRule).toBe("nonzero");
		});

		it("converts stroke-linecap and stroke-linejoin", () => {
			const result = sanitizeSvgPaths('<path d="M0" stroke-linecap="round" stroke-linejoin="bevel"/>');
			expect(result[0].props.strokeLinecap).toBe("round");
			expect(result[0].props.strokeLinejoin).toBe("bevel");
		});
	});
});
