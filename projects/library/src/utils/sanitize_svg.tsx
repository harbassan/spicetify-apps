import React from "react";

/**
 * Allowed SVG element tag names that can appear inside an <svg>.
 */
const ALLOWED_SVG_TAGS = new Set([
	"path",
	"circle",
	"rect",
	"line",
	"polyline",
	"polygon",
	"ellipse",
	"g",
]);

/**
 * Allowed attributes on SVG shape elements. Only these attributes
 * will be copied from the parsed markup to the rendered output.
 */
const ALLOWED_SVG_ATTRS = new Set([
	"d",
	"fill",
	"fill-rule",
	"clip-rule",
	"stroke",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"opacity",
	"transform",
	"cx",
	"cy",
	"r",
	"rx",
	"ry",
	"x",
	"y",
	"x1",
	"y1",
	"x2",
	"y2",
	"width",
	"height",
	"points",
	"viewBox",
]);

/**
 * Map of SVG attribute names to their React camelCase equivalents.
 */
const ATTR_TO_REACT_PROP: Record<string, string> = {
	"fill-rule": "fillRule",
	"clip-rule": "clipRule",
	"stroke-width": "strokeWidth",
	"stroke-linecap": "strokeLinecap",
	"stroke-linejoin": "strokeLinejoin",
};

/**
 * Recursively processes a single SVG DOM element, returning a React
 * element if the tag is allowed or `null` otherwise. Children of
 * container elements (e.g. `<g>`) are processed recursively so that
 * nested structures are preserved.
 */
function processElement(el: Element, key: number): React.ReactElement | null {
	const tagName = el.tagName.toLowerCase();
	if (!ALLOWED_SVG_TAGS.has(tagName)) return null;

	const props: Record<string, string> = { key: String(key) };
	for (let i = 0; i < el.attributes.length; i++) {
		const attr = el.attributes[i];
		if (ALLOWED_SVG_ATTRS.has(attr.name)) {
			const reactProp = ATTR_TO_REACT_PROP[attr.name] || attr.name;
			props[reactProp] = attr.value;
		}
	}

	const children: React.ReactElement[] = [];
	for (let i = 0; i < el.children.length; i++) {
		const child = processElement(el.children[i], i);
		if (child) children.push(child);
	}

	return React.createElement(tagName, props, children.length > 0 ? children : undefined);
}

/**
 * Parses an SVG markup string (e.g. '<path d="..."/><path d="..."/>')
 * and returns an array of React elements containing only allowed SVG
 * shape elements with only allowed attributes.
 *
 * This prevents XSS by stripping out any script tags, event handlers,
 * or other dangerous content that might be present in the string.
 */
export function sanitizeSvgPaths(svgMarkup: string): React.ReactElement[] {
	if (!svgMarkup) return [];

	const parser = new DOMParser();
	// Wrap in an SVG so the parser treats child elements as SVG namespace
	const doc = parser.parseFromString(
		`<svg xmlns="http://www.w3.org/2000/svg">${svgMarkup}</svg>`,
		"image/svg+xml",
	);

	const svgRoot = doc.documentElement;
	const elements: React.ReactElement[] = [];

	for (let i = 0; i < svgRoot.children.length; i++) {
		const child = processElement(svgRoot.children[i], i);
		if (child) elements.push(child);
	}

	return elements;
}
