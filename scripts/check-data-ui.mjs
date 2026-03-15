#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const targetDir = path.resolve(process.cwd(), process.argv[2] ?? 'src')
const requireFromWeb = createRequire(path.resolve(process.cwd(), 'package.json'))
const ts = requireFromWeb('typescript')

const failures = []
const DISPLAY_ATTRS = new Set(['label', 'title', 'placeholder', 'aria-label', 'alt'])
const ALLOWED_INLINE_TEXT = /^[-+0-9%/.:,()\s\u2014\u2013\u2022\u2192\u00b7\u00d7\u2191\u2193\u26e8]+$/

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (entry.isFile() && fullPath.endsWith('.tsx')) {
      checkFile(fullPath)
    }
  }
}

function checkFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  function report(node, message) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    failures.push(`${path.relative(process.cwd(), filePath)}:${line + 1}:${character + 1} ${message}`)
  }

  function textHasDisplayCopy(text) {
    const trimmed = text.replace(/\s+/g, ' ').trim()
    if (!trimmed) return false
    if (!/[A-Za-z]/.test(trimmed)) return false
    return !ALLOWED_INLINE_TEXT.test(trimmed)
  }

  function literalTextFromInitializer(initializer) {
    if (!initializer) return null
    if (ts.isStringLiteral(initializer)) return initializer.text
    if (ts.isJsxExpression(initializer)) {
      const expression = initializer.expression
      if (!expression) return null
      if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
        return expression.text
      }
      if (ts.isTemplateExpression(expression)) {
        const staticText = [
          expression.head.text,
          ...expression.templateSpans.map((span) => span.literal.text),
        ].join('')
        return staticText
      }
    }
    return null
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === 'div') {
        const hasDataUi = node.attributes.properties.some((attribute) => {
          if (!ts.isJsxAttribute(attribute)) return false
          return attribute.name.text === 'data-ui'
        })

        if (!hasDataUi) {
          report(node, '<div> missing data-ui')
        }
      }

      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue
        if (!DISPLAY_ATTRS.has(attribute.name.text)) continue
        const text = literalTextFromInitializer(attribute.initializer)
        if (text && textHasDisplayCopy(text)) {
          report(attribute, `display copy for "${attribute.name.text}" must come from UI_COPY or catalog data`)
        }
      }
    }

    if (ts.isJsxText(node) && textHasDisplayCopy(node.getText(sourceFile))) {
      report(node, 'inline JSX copy must come from UI_COPY or catalog data')
    }

    if (ts.isJsxExpression(node) && node.expression) {
      if (
        (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)) &&
        textHasDisplayCopy(node.expression.text)
      ) {
        report(node, 'inline JSX string literal must come from UI_COPY or catalog data')
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

if (!fs.existsSync(targetDir)) {
  console.error(`data-ui check target does not exist: ${targetDir}`)
  process.exit(1)
}

walk(targetDir)

if (failures.length > 0) {
  console.error('Data UI check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Data UI check passed for ${path.relative(process.cwd(), targetDir) || '.'}`)
