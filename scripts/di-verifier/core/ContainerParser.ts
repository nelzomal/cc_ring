/**
 * Parser for container.ts binding analysis
 */

import * as fs from 'fs';
import { BindingInfo } from '../types';
import { CONTAINER_PATH, PATTERNS, SCOPE_SINGLETON, SCOPE_TRANSIENT } from '../constants';

export class ContainerParser {
  private containerContent: string;

  constructor(containerPath: string = CONTAINER_PATH) {
    this.containerContent = fs.readFileSync(containerPath, 'utf-8');
  }

  /**
   * Parse all bindings from container.ts
   */
  parseBindings(): BindingInfo[] {
    const lines = this.containerContent.split('\n');
    const bindings: BindingInfo[] = [];
    let currentBinding: Partial<BindingInfo> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Match: .bind<Type>(TYPES.Symbol)
      const bindMatch = line.match(PATTERNS.BIND);
      if (bindMatch) {
        currentBinding = {
          line: lineNum,
          interfaceType: bindMatch[1],
          concreteType: '',
          scope: '',
          hasInterface: false,
        };
      }

      // Match: .to(ConcreteClass)
      const toMatch = line.match(PATTERNS.TO);
      if (toMatch && currentBinding.interfaceType) {
        currentBinding.concreteType = toMatch[1];
        currentBinding.hasInterface = currentBinding.interfaceType !== currentBinding.concreteType;

        // Check scope from next lines
        const nextLine = lines[i + 1];
        if (nextLine?.match(PATTERNS.SINGLETON_SCOPE)) {
          currentBinding.scope = SCOPE_SINGLETON;
        } else {
          currentBinding.scope = SCOPE_TRANSIENT;
        }

        bindings.push(currentBinding as BindingInfo);
        currentBinding = {};
      }

      // Match: .toConstantValue() or .toDynamicValue() - reset current binding
      if (line.includes('.toConstantValue') || line.includes('.toDynamicValue')) {
        currentBinding = {};
      }
    }

    return bindings;
  }

  /**
   * Extract all TYPES symbols from bindings
   */
  extractBoundSymbols(): Set<string> {
    const bindingMatches = this.containerContent.matchAll(PATTERNS.TYPES_USAGE);
    const boundSymbols = new Set<string>();

    for (const match of bindingMatches) {
      boundSymbols.add(match[1]);
    }

    return boundSymbols;
  }

  /**
   * Check if a symbol is used within container.ts via container.get()
   */
  isSymbolUsedInContainer(symbol: string): boolean {
    return PATTERNS.CONTAINER_GET(symbol).test(this.containerContent);
  }

  /**
   * Get the container content
   */
  getContent(): string {
    return this.containerContent;
  }

  /**
   * Check if container includes a specific interface name
   */
  includesInterface(interfaceName: string): boolean {
    return this.containerContent.includes(interfaceName);
  }
}
