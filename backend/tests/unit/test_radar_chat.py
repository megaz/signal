from app.schemas.radar import RadarChatRequest
from app.services.ai.radar_chat import _build_fallback_response


def test_radar_fallback_response_matches_contract():
    response = _build_fallback_response(
        RadarChatRequest(
            prompt="Find white-space opportunity for a skincare brand",
            brand="Demo Brand",
            category="Skincare",
            meta_signals=["UGC demo creatives are running 21+ days", "Discount CTA appears in most active ads"],
        )
    )

    assert response.widget in {
        "genome_map",
        "saturation_chart",
        "opportunity_scorecard",
        "competitor_matrix",
        "creative_brief",
        "luma_concepts",
    }
    assert response.brief.metrics[0].label == "Creative Opportunity Score"
    assert response.editSuggestions[0].action.payload.widget == "saturation_chart"
    assert "meta-only" in response.backendTrace.output
