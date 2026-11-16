package com.itwanger.pairesume.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TruncatedJsonRepairTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void repairsTruncatedArrayTailAndClosesBrackets() throws Exception {
        String truncated = "{\"name\":\"张三\",\"projects\":[{\"x\":1},{\"y\":2},{\"z\":tru";

        String repaired = TruncatedJsonRepair.repair(truncated);
        assertNotNull(repaired);

        JsonNode root = mapper.readTree(repaired);
        assertEquals("张三", root.path("name").asText());
        // 损坏的尾元素应被丢弃，完整保留的前两个元素仍在
        assertEquals(2, root.path("projects").size());
        assertEquals(1, root.path("projects").get(0).path("x").asInt());
        assertEquals(2, root.path("projects").get(1).path("y").asInt());
    }

    @Test
    void repairsTruncatedMidValue() throws Exception {
        String truncated = "{\"basicInfo\":{\"name\":\"张三\",\"summary\":\"熟练使用 Java、";

        String repaired = TruncatedJsonRepair.repair(truncated);
        assertNotNull(repaired);

        JsonNode root = mapper.readTree(repaired);
        assertEquals("张三", root.path("basicInfo").path("name").asText());
        // 字符串值中途截断：闭合引号保留半截内容
        assertEquals("熟练使用 Java、", root.path("basicInfo").path("summary").asText());
    }

    @Test
    void repairsTruncatedMidKeyDropsPartialKey() throws Exception {
        // 截断落在键名内部：不能闭合引号（会变成无冒号的悬空键），回退丢弃策略
        String truncated = "{\"basicInfo\":{\"name\":\"张三\",\"sum";

        String repaired = TruncatedJsonRepair.repair(truncated);
        assertNotNull(repaired);

        JsonNode root = mapper.readTree(repaired);
        assertEquals("张三", root.path("basicInfo").path("name").asText());
        assertFalse(root.path("basicInfo").has("sum"));
    }

    @Test
    void stripsDanglingEscapeBeforeClosingQuote() throws Exception {
        // 截断恰好落在转义反斜杠之后
        String truncated = "{\"skills\":[\"Java\",\"Go\\";

        String repaired = TruncatedJsonRepair.repair(truncated);
        assertNotNull(repaired);

        JsonNode root = mapper.readTree(repaired);
        assertEquals(2, root.path("skills").size());
    }

    @Test
    void returnsNullForAlreadyCompleteJson() {
        String complete = "{\"a\":1,\"b\":[1,2,3]}";
        assertNull(TruncatedJsonRepair.repair(complete));
    }

    @Test
    void repairsUnclosedObjectTail() throws Exception {
        String truncated = "{\"educations\":[{\"school\":\"清华大学\",\"degree\":\"本科\"";

        String repaired = TruncatedJsonRepair.repair(truncated);
        assertNotNull(repaired);

        JsonNode root = mapper.readTree(repaired);
        assertEquals(1, root.path("educations").size());
        assertEquals("清华大学", root.path("educations").get(0).path("school").asText());
    }

    @Test
    void repairsTruncatedTopLevelArrayItemString() throws Exception {
        // 截断发生在字符串值内部（AI 输出被 max_tokens 切断的典型形态）：保留半截元素
        String truncated = "{\"skills\":[\"Java\",\"Go\",\"深入理解 Redis 与消息队";

        String repaired = TruncatedJsonRepair.repair(truncated);
        assertNotNull(repaired);

        JsonNode root = mapper.readTree(repaired);
        assertEquals(3, root.path("skills").size());
        assertEquals("Java", root.path("skills").get(0).asText());
        assertEquals("深入理解 Redis 与消息队", root.path("skills").get(2).asText());
    }
}
