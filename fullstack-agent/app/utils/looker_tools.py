from google.adk.tools import ToolContext
import json

def generate_looker_url(
  looker_instance: str,
  model_id: str,
  explore_id: str,
  fields: list[str],
  filters: dict[str, str],
  limit: int,
  tool_context: ToolContext
) -> dict:
  """Generates a Looker explore URL from specified parameters.

  Use this tool to create a secure, authenticated Looker URL. The URL can be
  used in an iframe to embed a Looker explore into an application.

  Args:
    looker_instance (str): The hostname of the Looker instance (e.g., sandboxcl.dev.looker.com).
    model_id (str): The ID of the Looker model.
    explore_id (str): The ID of the Looker explore to embed.
    fields (list[str]): A list of fields to add to the explore (e.g., ['products.id', 'products.name']).
    filters (dict[str, str]): A dictionary of filters to apply to the explore (e.g., {'products.category': 'Intimates'}).
    limit (int): The number of records to return.

  Returns:
    dict: A dictionary containing the generated Looker URL and the operation status.
  """
 
  fields_str = ",".join(fields)

  filters_str = ""
  for key, value in filters.items():
    filters_str += f"&f[{key}]={value}"

  signed_url = (
      f"https://{looker_instance}/embed/explore/{model_id}/{explore_id}?"
      f"fields={fields_str}"
      f"{filters_str}"
      f"&limit={limit}"
  )
 
  return {"status": "success", "looker_url": signed_url}
