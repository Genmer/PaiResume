package com.itwanger.pairesume.util;

import java.util.ArrayList;
import java.util.List;

/**
 * 尝试修复被 max_tokens 截断的 JSON 文本。
 * <p>
 * 策略：单遍扫描，记录最近一次"完整值结束点"（某个值被逗号/闭合括号收尾的位置），
 * 截掉其后所有残缺内容，再按当时的开括号栈补齐闭合符号。
 * <p>
 * 例：{"a":[{"x":1},{"y":2},{"z":trunc → {"a":[{"x":1},{"y":2}]}
 */
public final class TruncatedJsonRepair {

    private TruncatedJsonRepair() {
    }

    /**
     * 修复截断的 JSON。若文本看起来完整（无未闭合容器）返回 null 表示无需/无法按截断处理。
     * <p>
     * 截断落在字符串值内部时，优先闭合引号保留半截内容（比整段丢弃更保真）；
     * 截断落在键名内部时回退到"最近完整值结束点"策略。
     */
    public static String repair(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }

        List<Character> stack = new ArrayList<>();
        // 记录"最近一个完整值结束点"：截断到此为止是安全的
        int lastValueEnd = -1;
        List<Character> stackAtLastValueEnd = new ArrayList<>();
        boolean inString = false;
        boolean escaped = false;
        int stringStart = -1;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }

            switch (c) {
                case '"' -> {
                    inString = true;
                    stringStart = i;
                }
                case '{', '[' -> stack.add(c);
                case '}', ']' -> {
                    if (!stack.isEmpty()) {
                        stack.remove(stack.size() - 1);
                    }
                    if (!stack.isEmpty()) {
                        // 关闭了一个"作为父容器值"的容器，此处是安全截断点
                        lastValueEnd = i + 1;
                        stackAtLastValueEnd = new ArrayList<>(stack);
                    }
                }
                case ',' -> {
                    if (!stack.isEmpty()) {
                        // 逗号前的值已完整；截断点取逗号下标（截掉逗号本身）
                        lastValueEnd = i;
                        stackAtLastValueEnd = new ArrayList<>(stack);
                    }
                }
                default -> {
                    // 普通字符（键名、数字、true/false/null 等）——只有后续出现 , } ] 才算值完整
                }
            }
        }

        // 栈空说明没有未闭合容器：不是截断问题，交由调用方按普通语法错误处理
        if (stack.isEmpty()) {
            return null;
        }

        // 截断落在字符串内部：判断能否闭合引号保留半截值
        if (inString && isRepairableValueString(json, stringStart, stack)) {
            String cut = json;
            if (escaped) {
                // 掐掉悬空的反斜杠，避免闭合引号被转义
                cut = cut.substring(0, cut.length() - 1);
            }
            StringBuilder repaired = new StringBuilder(cut).append('"');
            for (int i = stack.size() - 1; i >= 0; i--) {
                char open = stack.get(i);
                repaired.append(open == '{' ? '}' : ']');
            }
            return repaired.toString();
        }

        if (lastValueEnd <= 0) {
            return null;
        }

        String cut = json.substring(0, lastValueEnd).trim();
        // 若截断点落在逗号上，substring 已将其排除；若以其他残留结尾则再保险去尾逗号
        while (cut.endsWith(",")) {
            cut = cut.substring(0, cut.length() - 1).trim();
        }
        if (cut.isEmpty()) {
            return null;
        }

        StringBuilder repaired = new StringBuilder(cut);
        // 注意：stackAtLastValueEnd 是外→内顺序，闭合要内→外，因此倒序补
        for (int i = stackAtLastValueEnd.size() - 1; i >= 0; i--) {
            char open = stackAtLastValueEnd.get(i);
            repaired.append(open == '{' ? '}' : ']');
        }
        return repaired.toString();
    }

    /**
     * 截断点前的字符串是否为"值字符串"（闭合引号后即为合法 JSON）：
     * - 数组内：前一个非空白字符是 '[' 或 ',' → 数组元素
     * - 对象内：前一个非空白字符是 ':' → 键的值
     * - 对象内的 '{' 或 ',' 后 → 是键名（后面没有冒号），不能闭合保留
     */
    private static boolean isRepairableValueString(String json, int stringStart, List<Character> stack) {
        if (stringStart <= 0 || stack.isEmpty()) {
            return false;
        }
        int j = stringStart - 1;
        while (j >= 0 && Character.isWhitespace(json.charAt(j))) {
            j--;
        }
        if (j < 0) {
            return false;
        }
        char prev = json.charAt(j);
        char top = stack.get(stack.size() - 1);
        if (top == '[') {
            return prev == '[' || prev == ',';
        }
        return prev == ':';
    }
}
