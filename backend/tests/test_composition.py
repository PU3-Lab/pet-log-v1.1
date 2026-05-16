import unittest

from application.pipelines.pet_log_graph import LangGraphPetLogAgentPipeline
from composition import build_pet_log_agent_pipeline


class TestComposition(unittest.TestCase):
    def test_build_pet_log_agent_pipeline_returns_pipeline(self):
        pipeline = build_pet_log_agent_pipeline()

        self.assertIsInstance(pipeline, LangGraphPetLogAgentPipeline)

    def test_build_pet_log_agent_pipeline_connects_agent_node_wiring(self):
        pipeline = build_pet_log_agent_pipeline()

        self.assertEqual(
            {"structure_record", "load_context", "save_records"},
            set(pipeline.node_wiring),
        )
        self.assertGreater(len(pipeline.node_wiring["structure_record"].middleware), 0)
        self.assertGreater(len(pipeline.node_wiring["load_context"].tools), 0)
        self.assertGreater(len(pipeline.node_wiring["save_records"].middleware), 0)
