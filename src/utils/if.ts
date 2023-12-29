import {
  targetFor,
  type ComponentRenderTarget,
  ComponentReturnType,
  NodeReturnType,
  destroyElement,
} from "@/utils/component";
import { formula, type Cell, type MergedCell } from "@/utils/reactive";
import { bindUpdatingOpcode } from "@/utils/vm";
import { addDestructors } from "./component";

type GenericReturnType =
  | ComponentReturnType
  | NodeReturnType
  | ComponentReturnType[]
  | NodeReturnType[]
  | null
  | null[];

export function ifCondition(
  cell: Cell<boolean> | MergedCell,
  outlet: ComponentRenderTarget,
  trueBranch: () => GenericReturnType,
  falseBranch: () => GenericReturnType
) {
  // "if-placeholder"
  const placeholder = document.createComment('');
  const target = targetFor(outlet);
  target.appendChild(placeholder);
  let prevComponent: GenericReturnType = null;
  const runDestructors = () => {
    if (prevComponent) {
      destroyElement(prevComponent);
    }
  };

  if (typeof cell === "function") { 
    cell = formula(cell);
  } else if (typeof cell === 'boolean') {
    cell = formula(() => cell);
  }

  addDestructors([runDestructors, bindUpdatingOpcode(cell, (value) => {
    if (prevComponent) {
      destroyElement(prevComponent);
    }
    if (value === true) {
      prevComponent = trueBranch();
    } else {
      prevComponent = falseBranch();
    }
    renderElement(
      placeholder.parentElement || target,
      prevComponent,
      placeholder
    );
  })], placeholder);
}

function renderElement(
  target: Node,
  el: GenericReturnType,
  placeholder: Comment
) {
  if (!Array.isArray(el)) {
    if (el === null) {
      return;
    }
    if ("nodes" in el) {
      el.nodes.forEach((node) => {
        target.insertBefore(node, placeholder);
      });
    } else {
      target.insertBefore(el.node, placeholder);
    }
  } else {
    el.forEach((item) => {
      renderElement(target, item, placeholder);
    });
  }
}
